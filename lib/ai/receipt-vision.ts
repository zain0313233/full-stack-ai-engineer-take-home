import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { CATEGORIES } from "@/lib/utils/formatters";

const receiptSchema = z.object({
  merchant: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.string(),
});

export type ReceiptExtraction = z.infer<typeof receiptSchema>;

// Same model family as AI Teacher; fallbacks if one hits quota
const VISION_MODELS = [
  "gemini-flash-latest",
  "gemini-1.5-flash",
  "gemini-2.0-flash-lite",
] as const;

function normalizeCategory(raw: string): string {
  const match = CATEGORIES.find((c) => c.toLowerCase() === raw.toLowerCase());
  if (match) return match;
  const partial = CATEGORIES.find((c) => raw.toLowerCase().includes(c.toLowerCase()));
  return partial ?? "Other";
}

function parseJsonFromText(text: string): ReceiptExtraction | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? text.trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) return null;

  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    const result = receiptSchema.safeParse(parsed);
    if (!result.success) return null;
    return {
      ...result.data,
      category: normalizeCategory(result.data.category),
    };
  } catch {
    return null;
  }
}

function isQuotaError(err: unknown): boolean {
  const msg = String(err);
  return msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");
}

function retryDelayMs(err: unknown): number {
  const msg = String(err);
  const match = msg.match(/retry in ([\d.]+)s/i);
  if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 500;
  return 7000;
}

export function receiptErrorMessage(err: unknown): string {
  if (isQuotaError(err)) {
    return "Gemini API quota reached. Wait 1–2 minutes and try again, or enable billing at ai.google.dev.";
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("GEMINI_API_KEY")) {
    return "Gemini API key is missing. Add GEMINI_API_KEY to .env.local.";
  }
  if (msg.includes("parse")) {
    return "Could not read this receipt. Try a clearer, flatter photo with the total visible.";
  }
  return "Could not read this receipt. Try a clearer photo or enter the expense manually.";
}

function buildPrompt(userNote?: string) {
  const categories = CATEGORIES.filter((c) => c !== "Income").join(", ");
  return `You are reading a purchase receipt image for a personal finance app.
Extract the expense and respond with ONLY valid JSON (no markdown), shape:
{"merchant":"store name","amount":12.34,"date":"YYYY-MM-DD","category":"one of: ${categories}"}

Rules:
- amount must be a positive number (total paid, USD)
- date: use receipt date if visible, otherwise today's date
- category: pick the closest from the list
- merchant: business name on receipt
${userNote ? `User note: ${userNote}` : ""}`;
}

async function callGeminiVision(
  ai: GoogleGenAI,
  model: string,
  imageBase64: string,
  mimeType: string,
  prompt: string
) {
  return ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mimeType || "image/jpeg", data: imageBase64 } },
        ],
      },
    ],
  });
}

export async function extractReceiptFromImage(
  imageBase64: string,
  mimeType: string,
  userNote?: string
): Promise<ReceiptExtraction> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildPrompt(userNote);
  let lastError: unknown = null;

  for (const model of VISION_MODELS) {
    try {
      const response = await callGeminiVision(ai, model, imageBase64, mimeType, prompt);
      const text = response.text?.trim();
      if (!text) throw new Error("Gemini returned an empty receipt analysis");

      const parsed = parseJsonFromText(text);
      if (!parsed) throw new Error("Could not parse receipt details from Gemini response");

      console.log(`[receipt-vision] success with ${model}`);
      return parsed;
    } catch (err) {
      lastError = err;
      console.warn(`[receipt-vision] ${model} failed:`, String(err).slice(0, 200));

      if (isQuotaError(err)) {
        await new Promise((r) => setTimeout(r, retryDelayMs(err)));
        continue;
      }
    }
  }

  throw lastError ?? new Error("All Gemini vision models failed");
}
