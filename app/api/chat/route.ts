import { streamText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserBySupabaseId } from "@/lib/db/users";
import { getUserMemory } from "@/lib/db/memory";
import { appendMessage, createChatSession, updateSessionTitle } from "@/lib/db/chat";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { buildTools } from "@/lib/ai/tools";
import { getMonthName } from "@/lib/utils/formatters";
import { prisma } from "@/lib/db/prisma";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY! });
const MAIN_MODEL   = groq("llama-3.3-70b-versatile");
const VISION_MODEL = groq("meta-llama/llama-4-scout-17b-16e-instruct");

// Keep last N messages to stay inside free-tier 6k TPM
const MAX_HISTORY = 6;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return new Response("Unauthorized", { status: 401 });

    const dbUser = await getUserBySupabaseId(authUser.id);
    if (!dbUser) return new Response("User not found", { status: 404 });

    const body = await req.json();
    const { messages, sessionId: incomingSessionId, imageBase64, imageMimeType } = body;
    if (!messages?.length) return new Response("No messages", { status: 400 });

    const userMessage: string = messages[messages.length - 1]?.content ?? "";
    const isVision = !!imageBase64;

    // ── Pre-fetch context in parallel (no extra AI call needed) ─────────────
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

    // Build compact data context injected into the system prompt
    let dataContext = "No transactions imported yet.";
    if (txCount > 0 && oldest && newest) {
      const monthMap: Record<string, number> = {};
      for (const s of recentSummaries) {
        if (s.category === "Income") continue;
        const k = `${s.year}-${String(s.month).padStart(2,"0")}`;
        monthMap[k] = (monthMap[k] ?? 0) + s.total;
      }
      const monthList = Object.entries(monthMap)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([k, t]) => `${k}=$${Math.round(t)}`)
        .join(", ");

      const newestMonth  = newest.date.getMonth() + 1;
      const newestYear   = newest.date.getFullYear();
      const oldestMonth  = oldest.date.getMonth() + 1;
      const oldestYear   = oldest.date.getFullYear();
      const monthsOfData = (newestYear - oldestYear) * 12 + (newestMonth - oldestMonth) + 1;

      dataContext = [
        `Transactions: ${txCount}`,
        `Data range: ${oldestYear}-${String(oldestMonth).padStart(2,"0")} → ${newestYear}-${String(newestMonth).padStart(2,"0")} (${monthsOfData} month${monthsOfData !== 1 ? "s" : ""})`,
        `Most recent month for queries: ${newestYear}-${String(newestMonth).padStart(2,"0")}`,
        `Monthly totals (newest first): ${monthList}`,
      ].join("\n");
    }

    const now = new Date();
    const systemPrompt = buildSystemPrompt({
      userMemory,
      currentMonth: getMonthName(now.getMonth() + 1),
      currentYear: now.getFullYear(),
      dataContext,
      hasData: txCount > 0,
    });

    // ── Session management ───────────────────────────────────────────────────
    let sessionId = incomingSessionId;
    if (!sessionId) {
      const session = await createChatSession(dbUser.id);
      sessionId = session.id;
      await updateSessionTitle(sessionId, dbUser.id,
        userMessage.slice(0, 60) + (userMessage.length > 60 ? "…" : ""));
    }
    await appendMessage(sessionId, "user", userMessage,
      isVision ? { hasImage: true } : undefined);

    // ── Trim history ─────────────────────────────────────────────────────────
    const trimmed = messages.slice(-MAX_HISTORY);
    type AiMsg =
      | { role: "user";      content: string | Array<{ type: string; [k: string]: unknown }> }
      | { role: "assistant"; content: string };

    const aiMessages: AiMsg[] = trimmed.map((m: { role: string; content: string }, idx: number) => {
      if (isVision && idx === trimmed.length - 1 && imageBase64) {
        return {
          role: "user" as const,
          content: [
            { type: "text", text: m.content || "Read this receipt and log it as an expense." },
            { type: "image", image: imageBase64, mimeType: imageMimeType ?? "image/jpeg" },
          ],
        };
      }
      return { role: m.role as "user" | "assistant", content: m.content };
    });

    // ── Stream ───────────────────────────────────────────────────────────────
    const model  = isVision ? VISION_MODEL : MAIN_MODEL;
    const tools  = buildTools(dbUser.id);

    const result = streamText({
      model,
      system: systemPrompt,
      messages: aiMessages,
      tools: isVision ? undefined : tools,
      maxSteps: 3,
      maxTokens: 450,
      temperature: 0,
      onFinish: async ({ text }) => {
        if (text) await appendMessage(sessionId, "assistant", text, { model: model.modelId });
      },
    });

    return result.toDataStreamResponse({
      headers: { "X-Session-Id": sessionId },
    });
  } catch (err) {
    console.error("[chat]", err);
    return new Response("Internal server error", { status: 500 });
  }
}
