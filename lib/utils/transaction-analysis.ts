import type { ParsedTransaction } from "./csv-parser";

interface TxWithFlags extends ParsedTransaction {
  isRecurring: boolean;
  isAnomaly: boolean;
}

// A transaction is "recurring" if the same merchant appears with a similar
// amount in multiple different months.
export function detectRecurring(txs: ParsedTransaction[]): TxWithFlags[] {
  // Group by merchant
  const byMerchant: Record<string, ParsedTransaction[]> = {};
  for (const tx of txs) {
    const key = tx.merchant.toLowerCase();
    byMerchant[key] = byMerchant[key] ?? [];
    byMerchant[key].push(tx);
  }

  const recurringMerchants = new Set<string>();
  for (const [merchant, charges] of Object.entries(byMerchant)) {
    if (charges.length < 2) continue;
    const months = new Set(
      charges.map((t) => `${t.date.getFullYear()}-${t.date.getMonth()}`)
    );
    if (months.size < 2) continue;

    // Check amount consistency (within 5%)
    const amounts = charges.map((t) => t.amount);
    const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const consistent = amounts.every((a) => Math.abs(a - avg) / avg < 0.05);
    if (consistent) recurringMerchants.add(merchant);
  }

  return txs.map((tx) => ({
    ...tx,
    isRecurring: recurringMerchants.has(tx.merchant.toLowerCase()),
    isAnomaly: false,
  }));
}

// A transaction is "anomalous" if its amount is more than 2.5 standard
// deviations above the mean for its category.
export function detectAnomalies(txs: TxWithFlags[]): TxWithFlags[] {
  const byCategory: Record<string, number[]> = {};
  for (const tx of txs) {
    byCategory[tx.category] = byCategory[tx.category] ?? [];
    byCategory[tx.category].push(tx.amount);
  }

  const stats: Record<string, { mean: number; std: number }> = {};
  for (const [cat, amounts] of Object.entries(byCategory)) {
    if (amounts.length < 3) continue;
    const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance =
      amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length;
    stats[cat] = { mean, std: Math.sqrt(variance) };
  }

  return txs.map((tx) => {
    const s = stats[tx.category];
    if (!s || s.std === 0) return tx;
    const zScore = (tx.amount - s.mean) / s.std;
    return { ...tx, isAnomaly: zScore > 2.5 };
  });
}
