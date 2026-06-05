import { streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserBySupabaseId } from "@/lib/db/users";
import { getUserMemory } from "@/lib/db/memory";
import { appendMessage, createChatSession, updateSessionTitle } from "@/lib/db/chat";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { buildPrefetchContext } from "@/lib/ai/prefetch";
import { processReceiptUpload } from "@/lib/ai/receipt-import";
import { receiptErrorMessage } from "@/lib/ai/receipt-vision";
import { buildTools } from "@/lib/ai/tools";
import { formatCurrency } from "@/lib/utils/formatters";
import { getMonthName } from "@/lib/utils/formatters";
import { prisma } from "@/lib/db/prisma";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! });
const MAIN_MODEL = groq("llama-3.3-70b-versatile");

const MAX_HISTORY = 6;

function buildReceiptPrompt(result: Awaited<ReturnType<typeof processReceiptUpload>>) {
  if (result.skipped) {
    return [
      "## Receipt just processed",
      `Gemini read the receipt: ${result.merchant}, ${formatCurrency(result.amount)}, ${result.date}, ${result.category}.`,
      "This expense is already in the user's account (duplicate). Tell them politely — do not claim it was logged again.",
      result.imageUrl ? `Receipt image URL: ${result.imageUrl}` : "",
    ].join("\n");
  }

  return [
    "## Receipt just processed",
    `Gemini read the receipt and it was SAVED as a transaction.`,
    `Merchant: ${result.merchant} | Amount: ${formatCurrency(result.amount)} | Date: ${result.date} | Category: ${result.category}`,
    result.imageUrl ? `Receipt image stored at: ${result.imageUrl} (URL only in DB, not the image bytes)` : "",
    "Confirm the logged expense warmly in 2-3 sentences. Mention it is now in their transactions.",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return new Response("Unauthorized", { status: 401 });

    const dbUser = await getUserBySupabaseId(authUser.id);
    if (!dbUser) return new Response("User not found", { status: 404 });

    const body = await req.json();
    const {
      messages,
      sessionId: incomingSessionId,
      imageBase64,
      imageMimeType,
      attachmentName,
      attachmentDataUrl,
    } = body;
    if (!messages?.length) return new Response("No messages", { status: 400 });

    const userMessage: string = messages[messages.length - 1]?.content ?? "";
    const hasReceiptImage = !!imageBase64;
    const hasFileAttachment = !!attachmentDataUrl || hasReceiptImage;

    let receiptContext = "";
    let messageMeta: Record<string, unknown> | undefined;

    if (hasReceiptImage) {
      try {
        const receiptResult = await processReceiptUpload(
          dbUser.id,
          imageBase64,
          imageMimeType ?? "image/jpeg",
          userMessage || undefined
        );
        receiptContext = buildReceiptPrompt(receiptResult);
        messageMeta = {
          hasImage: true,
          imageUrl: receiptResult.imageUrl,
          attachments: [
            {
              url: receiptResult.imageUrl,
              contentType: imageMimeType ?? "image/jpeg",
              name: attachmentName ?? "receipt",
            },
          ],
          receipt: {
            merchant: receiptResult.merchant,
            amount: receiptResult.amount,
            date: receiptResult.date,
            category: receiptResult.category,
            imported: receiptResult.imported,
          },
        };
      } catch (err) {
        console.error("[chat receipt]", err);
        return NextResponse.json({ error: receiptErrorMessage(err) }, { status: 422 });
      }
    }

    const [userMemory, txCount, oldest, newest, recentSummaries] = await Promise.all([
      getUserMemory(dbUser.id),
      prisma.transaction.count({ where: { userId: dbUser.id } }),
      prisma.transaction.findFirst({ where: { userId: dbUser.id }, orderBy: { date: "asc" }, select: { date: true } }),
      prisma.transaction.findFirst({ where: { userId: dbUser.id }, orderBy: { date: "desc" }, select: { date: true } }),
      prisma.spendingSummary.findMany({
        where: { userId: dbUser.id },
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 18,
      }),
    ]);

    let dataContext = "No transactions imported yet.";
    if (txCount > 0 && oldest && newest) {
      const monthMap: Record<string, number> = {};
      for (const s of recentSummaries) {
        if (s.category === "Income") continue;
        const k = `${s.year}-${String(s.month).padStart(2, "0")}`;
        monthMap[k] = (monthMap[k] ?? 0) + s.total;
      }
      const monthList = Object.entries(monthMap)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([k, t]) => `${k}=$${Math.round(t)}`)
        .join(", ");

      const newestMonth = newest.date.getMonth() + 1;
      const newestYear = newest.date.getFullYear();
      const oldestMonth = oldest.date.getMonth() + 1;
      const oldestYear = oldest.date.getFullYear();
      const monthsOfData = (newestYear - oldestYear) * 12 + (newestMonth - oldestMonth) + 1;

      dataContext = [
        `Transactions: ${txCount}`,
        `Data range: ${oldestYear}-${String(oldestMonth).padStart(2, "0")} → ${newestYear}-${String(newestMonth).padStart(2, "0")} (${monthsOfData} month${monthsOfData !== 1 ? "s" : ""})`,
        `Most recent month for queries: ${newestYear}-${String(newestMonth).padStart(2, "0")}`,
        `Monthly totals (newest first): ${monthList}`,
      ].join("\n");
    }

    const now = new Date();
    const prefetchContext =
      txCount > 0
        ? await buildPrefetchContext(dbUser.id, now.getFullYear(), now.getMonth() + 1)
        : undefined;

    let systemPrompt = buildSystemPrompt({
      userMemory,
      currentMonth: getMonthName(now.getMonth() + 1),
      currentYear: now.getFullYear(),
      dataContext,
      prefetchContext,
      hasData: txCount > 0,
    });

    if (receiptContext) {
      systemPrompt += `\n\n${receiptContext}`;
    }

    let sessionId = incomingSessionId;
    if (!sessionId) {
      const session = await createChatSession(dbUser.id);
      sessionId = session.id;
      await updateSessionTitle(
        sessionId,
        dbUser.id,
        (hasReceiptImage ? "Receipt: " : "") +
          userMessage.slice(0, 50) +
          (userMessage.length > 50 ? "…" : "")
      );
    }

    if (!messageMeta && hasFileAttachment && attachmentDataUrl) {
      messageMeta = {
        attachments: [
          {
            url: attachmentDataUrl,
            contentType: imageMimeType ?? "application/octet-stream",
            name: attachmentName ?? "attachment",
          },
        ],
      };
    }

    await appendMessage(
      sessionId,
      "user",
      userMessage || (hasReceiptImage ? "Uploaded a receipt" : hasFileAttachment ? "Shared an attachment" : ""),
      messageMeta
    );

    const trimmed = messages.slice(-MAX_HISTORY);
    const aiMessages = trimmed.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content:
        hasReceiptImage && m === trimmed[trimmed.length - 1]
          ? m.content || "I uploaded a receipt — please confirm what you logged."
          : m.content,
    }));

    const { search_web, save_user_memory } = buildTools(dbUser.id);

    const result = streamText({
      model: MAIN_MODEL,
      system: systemPrompt,
      messages: aiMessages,
      tools: hasReceiptImage ? undefined : { search_web, save_user_memory },
      maxSteps: 2,
      maxTokens: 450,
      temperature: 0,
      onFinish: async ({ text, finishReason }) => {
        if (text?.trim()) {
          await appendMessage(sessionId, "assistant", text, {
            model: MAIN_MODEL.modelId,
            finishReason,
            receiptProcessed: hasReceiptImage,
          });
        }
      },
    });

    return result.toDataStreamResponse({
      headers: { "X-Session-Id": sessionId },
      getErrorMessage: (error) => {
        console.error("[chat stream]", error);
        return "Something went wrong. Please try again.";
      },
    });
  } catch (err) {
    console.error("[chat]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
