import { prisma } from "@/lib/db/prisma";
import { getBudgets } from "@/lib/db/budgets";
import { getAnomalousTransactions, getRecurringTransactions, getSpendingSummaries } from "@/lib/db/transactions";
import { formatCurrency } from "@/lib/utils/formatters";

export async function buildPrefetchContext(userId: string, year: number, month: number) {
  const [recurring, subscriptionFallback, anomalies, budgets, monthSummaries] = await Promise.all([
    getRecurringTransactions(userId),
    prisma.transaction.findMany({
      where: { userId, category: { equals: "Subscriptions", mode: "insensitive" } },
      orderBy: { date: "desc" },
      take: 20,
    }),
    getAnomalousTransactions(userId, 5),
    getBudgets(userId),
    getSpendingSummaries(userId, year, month),
  ]);

  const subscriptionSource = recurring.length > 0 ? recurring : subscriptionFallback;
  const byMerchant: Record<string, (typeof subscriptionSource)[0]> = {};
  for (const tx of subscriptionSource) {
    if (!byMerchant[tx.merchant] || tx.date > byMerchant[tx.merchant].date) {
      byMerchant[tx.merchant] = tx;
    }
  }
  const subscriptions = Object.values(byMerchant)
    .sort((a, b) => b.amount - a.amount)
    .map((tx) => `${tx.merchant} ${formatCurrency(tx.amount)}/mo`)
    .join(", ");

  const subscriptionTotal = Object.values(byMerchant).reduce((s, t) => s + t.amount, 0);

  const anomalyLines = anomalies
    .map((t) => `${t.merchant} ${formatCurrency(t.amount)} (${t.category})`)
    .join(", ");

  const spendMap = Object.fromEntries(monthSummaries.map((s) => [s.category, s.total]));
  const budgetLines = budgets
    .map((b) => {
      const spent = spendMap[b.category] ?? 0;
      const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
      const status = spent > b.amount ? "OVER" : spent / b.amount > 0.8 ? "NEAR" : "OK";
      return `${b.category}: ${formatCurrency(spent)}/${formatCurrency(b.amount)} (${pct}% ${status})`;
    })
    .join(", ");

  const categoryLines = monthSummaries
    .filter((s) => s.category !== "Income")
    .sort((a, b) => b.total - a.total)
    .map((s) => `${s.category}:${formatCurrency(s.total)}`)
    .join(", ");

  const lines = [
    subscriptions
      ? `Subscriptions (${Object.keys(byMerchant).length}): ${subscriptions} | est monthly total: ${formatCurrency(subscriptionTotal)}`
      : "Subscriptions: none detected",
    anomalyLines ? `Unusual charges: ${anomalyLines}` : "Unusual charges: none flagged",
    budgets.length > 0
      ? `Budgets this month: ${budgetLines}`
      : "Budgets: none set",
    categoryLines
      ? `This month by category: ${categoryLines}`
      : `This month by category: no spending yet`,
  ];

  return lines.join("\n");
}
