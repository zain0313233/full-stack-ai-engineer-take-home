import { prisma } from "@/lib/db/prisma";
import { getBudgets } from "@/lib/db/budgets";
import { getAnomalousTransactions, getSpendingSummaries } from "@/lib/db/transactions";
import { formatCurrency } from "@/lib/utils/formatters";

const INCOME_CATEGORIES = new Set(["income", "salary", "payroll"]);

function isIncome(tx: { category: string; merchant: string }) {
  const cat = tx.category.toLowerCase();
  const merchant = tx.merchant.toLowerCase();
  return (
    INCOME_CATEGORIES.has(cat) ||
    merchant.includes("salary") ||
    merchant.includes("payroll") ||
    merchant.includes("deposit") && merchant.includes("salary")
  );
}

export async function buildPrefetchContext(userId: string, year: number, month: number) {
  const threeWeeksAgo = new Date();
  threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);

  const [subscriptionTxs, anomalies, budgets, monthSummaries, recentTxs, latestIncome, biggestRecent] =
    await Promise.all([
      prisma.transaction.findMany({
        where: { userId, category: { equals: "Subscriptions", mode: "insensitive" } },
        orderBy: { date: "desc" },
        take: 30,
      }),
      getAnomalousTransactions(userId, 5),
      getBudgets(userId),
      getSpendingSummaries(userId, year, month),
      prisma.transaction.findMany({
        where: { userId, date: { gte: threeWeeksAgo } },
        orderBy: [{ date: "desc" }, { amount: "desc" }],
        take: 25,
      }),
      prisma.transaction.findFirst({
        where: {
          userId,
          OR: [
            { category: { equals: "Income", mode: "insensitive" } },
            { merchant: { contains: "salary", mode: "insensitive" } },
          ],
        },
        orderBy: { date: "desc" },
      }),
      prisma.transaction.findFirst({
        where: {
          userId,
          date: { gte: threeWeeksAgo },
          NOT: { category: { equals: "Income", mode: "insensitive" } },
        },
        orderBy: { amount: "desc" },
      }),
    ]);

  // Subscriptions — Subscriptions category only, never income or gas/groceries
  const byMerchant: Record<string, (typeof subscriptionTxs)[0]> = {};
  for (const tx of subscriptionTxs) {
    if (isIncome(tx)) continue;
    if (!byMerchant[tx.merchant] || tx.date > byMerchant[tx.merchant].date) {
      byMerchant[tx.merchant] = tx;
    }
  }
  const subscriptionList = Object.values(byMerchant)
    .sort((a, b) => b.amount - a.amount)
    .map((tx) => `${tx.merchant} ${formatCurrency(tx.amount)}/mo`)
    .join(", ");
  const subscriptionTotal = Object.values(byMerchant).reduce((s, t) => s + t.amount, 0);
  const subscriptionsThisMonth = monthSummaries.find(
    (s) => s.category.toLowerCase() === "subscriptions"
  );

  const salaryLine = latestIncome
    ? `Latest salary/income: ${latestIncome.merchant} ${formatCurrency(latestIncome.amount)} on ${latestIncome.date.toISOString().slice(0, 10)} (this is INCOME, not a subscription)`
    : "Salary/income: none recorded";

  const recentLines = recentTxs
    .map(
      (t) =>
        `${t.date.toISOString().slice(0, 10)} ${t.merchant} ${formatCurrency(t.amount)} (${t.category})`
    )
    .join(" | ");

  const biggestLine = biggestRecent
    ? `Biggest recent purchase (last 21 days, excl. income): ${biggestRecent.merchant} ${formatCurrency(biggestRecent.amount)} on ${biggestRecent.date.toISOString().slice(0, 10)} (${biggestRecent.category})`
    : "Biggest recent purchase: none in last 21 days";

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
    .filter((s) => !isIncome({ category: s.category, merchant: "" }))
    .sort((a, b) => b.total - a.total)
    .map((s) => `${s.category}:${formatCurrency(s.total)}`)
    .join(", ");

  const lines = [
    subscriptionList
      ? `Recurring subscriptions only (${Object.keys(byMerchant).length}): ${subscriptionList} | est total: ${formatCurrency(subscriptionTotal)}/mo`
      : "Recurring subscriptions: none in Subscriptions category",
    subscriptionsThisMonth
      ? `Subscriptions spent this month (${year}-${String(month).padStart(2, "0")}): ${formatCurrency(subscriptionsThisMonth.total)}`
      : `Subscriptions spent this month: $0`,
    salaryLine,
    biggestLine,
    recentTxs.length > 0
      ? `Recent transactions (last 21 days, ${recentTxs.length} shown): ${recentLines}`
      : "Recent transactions (last 21 days): none",
    anomalyLines ? `Unusual charges flagged: ${anomalyLines}` : "Unusual charges: none flagged",
    budgets.length > 0 ? `Budgets this month: ${budgetLines}` : "Budgets: none set",
    categoryLines
      ? `This month by category: ${categoryLines}`
      : "This month by category: no spending yet",
  ];

  return lines.join("\n");
}
