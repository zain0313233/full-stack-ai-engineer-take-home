import { prisma } from "@/lib/db/prisma";
import { invalidateDataOverview } from "@/lib/db/data-overview";
import { incrementSpendingSummary } from "@/lib/db/transactions";
import { extractReceiptFromImage } from "@/lib/ai/receipt-vision";
import { uploadUserFile } from "@/lib/storage/bucket";
import { detectAnomalies, detectRecurring } from "@/lib/utils/transaction-analysis";
import type { ParsedTransaction } from "@/lib/utils/csv-parser";

export interface ReceiptImportResult {
  imported: boolean;
  skipped: boolean;
  merchant: string;
  amount: number;
  date: string;
  category: string;
  imageUrl: string | null;
}

function txKey(date: Date, merchant: string, amount: number) {
  return `${date.toISOString().slice(0, 10)}|${merchant.toLowerCase()}|${amount}`;
}

export async function processReceiptUpload(
  userId: string,
  imageBase64: string,
  mimeType: string,
  userNote?: string
): Promise<ReceiptImportResult> {
  const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
  const buffer = Buffer.from(imageBase64, "base64");

  const [imageUrl, extracted] = await Promise.all([
    uploadUserFile(userId, `receipt.${ext}`, buffer, mimeType || "image/jpeg"),
    extractReceiptFromImage(imageBase64, mimeType, userNote),
  ]);

  const txDate = new Date(extracted.date);
  if (Number.isNaN(txDate.getTime())) {
    throw new Error("Invalid date on receipt");
  }

  const existing = await prisma.transaction.findMany({
    where: { userId },
    select: { date: true, merchant: true, amount: true },
  });
  const isDuplicate = existing.some(
    (tx) => txKey(tx.date, tx.merchant, tx.amount) === txKey(txDate, extracted.merchant, extracted.amount)
  );

  if (isDuplicate) {
    return {
      imported: false,
      skipped: true,
      merchant: extracted.merchant,
      amount: extracted.amount,
      date: extracted.date,
      category: extracted.category,
      imageUrl,
    };
  }

  const parsed: ParsedTransaction = {
    date: txDate,
    merchant: extracted.merchant,
    amount: extracted.amount,
    category: extracted.category,
    description: userNote || extracted.merchant,
    source: "receipt",
    rawData: { imageUrl, geminiExtraction: extracted },
  };

  const [withFlags] = detectAnomalies(detectRecurring([parsed]));

  await prisma.transaction.create({
    data: {
      userId,
      date: withFlags.date,
      merchant: withFlags.merchant,
      amount: withFlags.amount,
      category: withFlags.category,
      description: withFlags.description,
      source: "receipt",
      rawData: withFlags.rawData,
      isRecurring: withFlags.isRecurring,
      isAnomaly: withFlags.isAnomaly,
    },
  });

  await incrementSpendingSummary(
    userId,
    txDate.getFullYear(),
    txDate.getMonth() + 1,
    withFlags.category,
    withFlags.amount
  );

  invalidateDataOverview(userId);

  return {
    imported: true,
    skipped: false,
    merchant: extracted.merchant,
    amount: extracted.amount,
    date: extracted.date,
    category: extracted.category,
    imageUrl,
  };
}
