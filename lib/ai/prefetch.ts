import { prisma } from "@/lib/db/prisma";
import { getBudgets } from "@/lib/db/budgets";
import { getAnomalousTransactions, getSpendingSummaries } from "@/lib/db/transactions";
import { formatCurrency } from "@/lib/utils/formatters";
import { getCachedOrFetch } from "@/lib/cache/memory";
import type { PrefetchMode } from "./query-router";

const PREFETCH_TTL_MS = 45_000;

const INCOME_CATEGORIES = new Set(["income", "salary", "payroll"]);

function isIncome(tx: { category: string; merchant: string }) {
  const cat = tx.category.toLowerCase();
  const merchant = tx.merchant.toLowerCase();
  return (
    INCOME_CATEGORIES.has(cat) ||
    merchant.includes("salary") ||
    merchant.includes("payroll") ||
    (merchant.includes("deposit") && merchant.includes("salary"))
  );
}

async function fetchRecentContext(userId: string) {
  const threeWeeksAgo = new Date();
  threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);

  const [recentTxs, biggestRecent, latestIncome] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: threeWeeksAgo } },
      orderBy: [{ date: "desc" }, { amount: "desc" }],
      take: 15,
      select: { date: true, merchant: true, amount: true, category: true },
    }),
    prisma.transaction.findFirst({
      where: {
        userId,
        date: { gte: threeWeeksAgo },
        NOT: { category: { equals: "Income", mode: "insensitive" } },
      },
      orderBy: { amount: "desc" },
      select: { date: true, merchant: true, amount: true, category: true },
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
      select: { date: true, merchant: true, amount: true, category: true },
    }),
  ]);

  const lines: string[] = [];

  if (biggestRecent) {
    lines.push(
      `Biggest recent purchase (last 21 days, excl. income): ${biggestRecent.merchant} ${formatCurrency(biggestRecent.amount)} on ${biggestRecent.date.toISOString().slice(0, 10)} (${biggestRecent.category})`
    );
  }

  if (latestIncome) {
    lines.push(
      `Latest salary/income: ${latestIncome.merchant} ${formatCurrency(latestIncome.amount)} on ${latestIncome.date.toISOString().slice(0, 10)}`
    );
  }

  if (recentTxs.length > 0) {
    const recentLines = recentTxs
      .map(
        (t) =>
          `${t.date.toISOString().slice(0, 10)} ${t.merchant} ${formatCurrency(t.amount)} (${t.category})`
      )
      .join(" | ");
    lines.push(`Recent transactions (last 21 days): ${recentLines}`);
  }

  return lines;
}

async function fetchSubscriptionsContext(userId: string, year: number, month: number) {
  const [subscriptionTxs, monthSummaries] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, category: { equals: "Subscriptions", mode: "insensitive" } },
      orderBy: { date: "desc" },
      take: 20,
      select: { merchant: true, amount: true, date: true, category: true },
    }),
    getSpendingSummaries(userId, year, month),
  ]);

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

  const lines: string[] = [];
  lines.push(
    subscriptionList
      ? `Recurring subscriptions (${Object.keys(byMerchant).length}): ${subscriptionList} | est total: ${formatCurrency(subscriptionTotal)}/mo`
      : "Recurring subscriptions: none in Subscriptions category"
  );

  if (subscriptionsThisMonth) {
    lines.push(
      `Subscriptions spent this month (${year}-${String(month).padStart(2, "0")}): ${formatCurrency(subscriptionsThisMonth.total)}`
    );
  }

  return lines;
}

async function fetchBudgetsContext(userId: string, year: number, month: number) {
  const [budgets, monthSummaries] = await Promise.all([
    getBudgets(userId),
    getSpendingSummaries(userId, year, month),
  ]);

  if (budgets.length === 0) return ["Budgets: none set"];

  const spendMap = Object.fromEntries(monthSummaries.map((s) => [s.category, s.total]));
  const budgetLines = budgets
    .map((b) => {
      const spent = spendMap[b.category] ?? 0;
      const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
      const status = spent > b.amount ? "OVER" : spent / b.amount > 0.8 ? "NEAR" : "OK";
      return `${b.category}: ${formatCurrency(spent)}/${formatCurrency(b.amount)} (${pct}% ${status})`;
    })
    .join(", ");

  return [`Budgets this month: ${budgetLines}`];
}

async function fetchAnomaliesContext(userId: string) {
  const anomalies = await getAnomalousTransactions(userId, 5);
  if (anomalies.length === 0) return ["Unusual charges: none flagged"];

  const anomalyLines = anomalies
    .map((t) => `${t.merchant} ${formatCurrency(t.amount)} (${t.category})`)
    .join(", ");
  return [`Unusual charges flagged: ${anomalyLines}`];
}

async function fetchSpendingContext(userId: string, year: number, month: number) {
  const monthSummaries = await getSpendingSummaries(userId, year, month);
  const categoryLines = monthSummaries
    .filter((s) => !isIncome({ category: s.category, merchant: "" }))
    .sort((a, b) => b.total - a.total)
    .map((s) => `${s.category}:${formatCurrency(s.total)}`)
    .join(", ");

  return categoryLines
    ? [`This month by category: ${categoryLines}`]
    : ["This month by category: no spending yet"];
}

export async function buildPrefetchContext(
  userId: string,
  year: number,
  month: number,
  modes: PrefetchMode[]
) {
  if (modes.length === 0) return undefined;

  const cacheKey = `user:${userId}:prefetch:${year}-${month}:${modes.sort().join(",")}`;

  return getCachedOrFetch(cacheKey, PREFETCH_TTL_MS, async () => {
    const fetches: Promise<string[]>[] = [];

    if (modes.includes("recent")) fetches.push(fetchRecentContext(userId));
    if (modes.includes("subscriptions")) fetches.push(fetchSubscriptionsContext(userId, year, month));
    if (modes.includes("budgets")) fetches.push(fetchBudgetsContext(userId, year, month));
    if (modes.includes("anomalies")) fetches.push(fetchAnomaliesContext(userId));
    if (modes.includes("spending")) fetches.push(fetchSpendingContext(userId, year, month));

    const chunks = await Promise.all(fetches);
    return chunks.flat().join("\n");
  });
}
