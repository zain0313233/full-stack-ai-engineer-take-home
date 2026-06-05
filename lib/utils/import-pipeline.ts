import { prisma } from "@/lib/db/prisma";
import { createTransactionsBatch, upsertSpendingSummary } from "@/lib/db/transactions";
import type { ParsedTransaction } from "@/lib/utils/csv-parser";
import { detectAnomalies, detectRecurring } from "@/lib/utils/transaction-analysis";

export interface ImportPipelineResult {
  imported: number;
  skipped: number;
  recurring: number;
  anomalies: number;
}

function txKey(date: Date, merchant: string, amount: number) {
  return `${date.toISOString().slice(0, 10)}|${merchant.toLowerCase()}|${amount}`;
}

async function filterExistingDuplicates(userId: string, transactions: ParsedTransaction[]) {
  const existing = await prisma.transaction.findMany({
    where: { userId },
    select: { date: true, merchant: true, amount: true },
  });

  const existingKeys = new Set(existing.map((tx) => txKey(tx.date, tx.merchant, tx.amount)));
  const fresh: ParsedTransaction[] = [];
  let skipped = 0;

  for (const tx of transactions) {
    if (existingKeys.has(txKey(tx.date, tx.merchant, tx.amount))) {
      skipped++;
      continue;
    }
    fresh.push(tx);
  }

  return { fresh, skipped };
}

export async function importTransactionsForUser(
  userId: string,
  transactions: ParsedTransaction[]
): Promise<ImportPipelineResult> {
  if (transactions.length === 0) {
    return { imported: 0, skipped: 0, recurring: 0, anomalies: 0 };
  }

  const { fresh, skipped } = await filterExistingDuplicates(userId, transactions);
  if (fresh.length === 0) {
    return { imported: 0, skipped, recurring: 0, anomalies: 0 };
  }

  const withFlags = detectRecurring(fresh);
  const withAnomalies = detectAnomalies(withFlags);

  await createTransactionsBatch(userId, withAnomalies);

  const summaryMap = new Map<string, { total: number; count: number }>();
  for (const tx of withAnomalies) {
    const key = `${tx.date.getFullYear()}|${tx.date.getMonth() + 1}|${tx.category}`;
    const existing = summaryMap.get(key) ?? { total: 0, count: 0 };
    summaryMap.set(key, { total: existing.total + tx.amount, count: existing.count + 1 });
  }

  await Promise.all(
    Array.from(summaryMap.entries()).map(([key, { total, count }]) => {
      const [year, month, category] = key.split("|");
      return upsertSpendingSummary(userId, parseInt(year), parseInt(month), category, total, count);
    })
  );

  return {
    imported: withAnomalies.length,
    skipped,
    recurring: withAnomalies.filter((t) => t.isRecurring).length,
    anomalies: withAnomalies.filter((t) => t.isAnomaly).length,
  };
}
