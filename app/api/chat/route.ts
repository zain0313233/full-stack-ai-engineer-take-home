import { streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { MAX_IMAGE_BASE64_CHARS } from "@/lib/api/validation";
import { getUserMemory } from "@/lib/db/memory";
import { appendMessage, createChatSession, updateSessionTitle } from "@/lib/db/chat";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { buildPrefetchContext } from "@/lib/ai/prefetch";
import { processReceiptUpload } from "@/lib/ai/receipt-import";
import { receiptErrorMessage } from "@/lib/ai/receipt-vision";
import { routeChatQuery, selectChatStrategy } from "@/lib/ai/query-router";
import { buildTools } from "@/lib/ai/tools";
import { formatCurrency } from "@/lib/utils/formatters";
import { getMonthName } from "@/lib/utils/formatters";
import { getDataOverview } from "@/lib/db/data-overview";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! });
const MAIN_MODEL = groq("llama-3.3-70b-versatile");
const FAST_MODEL = groq("llama-3.1-8b-instant");

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

function persistUserMessage(
  sessionId: string,
  content: string,
  messageMeta?: Record<string, unknown>
) {
  void appendMessage(sessionId, "user", content, messageMeta).catch((err) =>
    console.error("[chat] save user message", err)
  );
}

function persistSessionTitle(sessionId: string, userId: string, title: string) {
  void updateSessionTitle(sessionId, userId, title).catch((err) =>
    console.error("[chat] update title", err)
  );
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const { dbUser } = auth.ctx;

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

    if (imageBase64 && imageBase64.length > MAX_IMAGE_BASE64_CHARS) {
      return NextResponse.json({ error: "Image too large (max ~5 MB)" }, { status: 413 });
    }

    const userMessage: string = String(messages[messages.length - 1]?.content ?? "").slice(
      0,
      4000
    );
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

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const prefetchModes = routeChatQuery(userMessage);

    const [userMemory, { txCount, dataContext }, prefetchContext] = await Promise.all([
      getUserMemory(dbUser.id),
      getDataOverview(dbUser.id),
      hasReceiptImage
        ? Promise.resolve(undefined)
        : buildPrefetchContext(dbUser.id, year, month, prefetchModes),
    ]);

    let systemPrompt = buildSystemPrompt({
      userMemory,
      currentMonth: getMonthName(month),
      currentYear: year,
      dataContext,
      prefetchContext,
      hasData: txCount > 0,
    });

    if (receiptContext) {
      systemPrompt += `\n\n${receiptContext}`;
    }

    let sessionId = incomingSessionId as string | undefined;
    const isNewSession = !sessionId;

    if (isNewSession) {
      const session = await createChatSession(dbUser.id);
      sessionId = session.id;
      persistSessionTitle(
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

    const userContent =
      userMessage ||
      (hasReceiptImage ? "Uploaded a receipt" : hasFileAttachment ? "Shared an attachment" : "");

    persistUserMessage(sessionId!, userContent, messageMeta);

    const trimmed = messages.slice(-MAX_HISTORY);
    const aiMessages = trimmed.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content:
        hasReceiptImage && m === trimmed[trimmed.length - 1]
          ? m.content || "I uploaded a receipt — please confirm what you logged."
          : m.content,
    }));

    const { useFastModel: useFast, enableTools } = selectChatStrategy(
      userMessage,
      prefetchModes,
      !!prefetchContext,
      hasReceiptImage
    );
    const model = useFast ? FAST_MODEL : MAIN_MODEL;
    const { search_web, save_user_memory } = buildTools(dbUser.id);
    const tools = enableTools ? { search_web, save_user_memory } : undefined;

    const result = streamText({
      model,
      system: systemPrompt,
      messages: aiMessages,
      tools,
      maxSteps: 1,
      maxTokens: 450,
      temperature: 0,
      onFinish: async ({ text, finishReason }) => {
        if (text?.trim()) {
          await appendMessage(sessionId!, "assistant", text, {
            model: model.modelId,
            finishReason,
            receiptProcessed: hasReceiptImage,
          });
        }
      },
    });

    return result.toDataStreamResponse({
      headers: { "X-Session-Id": sessionId! },
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
