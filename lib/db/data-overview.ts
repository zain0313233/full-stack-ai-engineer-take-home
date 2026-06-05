import { prisma } from "./prisma";
import { getCachedOrFetch, invalidateUserCache } from "@/lib/cache/memory";

const OVERVIEW_TTL_MS = 60_000;

export type DataOverview = {
  txCount: number;
  dataContext: string;
};

export async function getDataOverview(userId: string): Promise<DataOverview> {
  return getCachedOrFetch(`user:${userId}:overview`, OVERVIEW_TTL_MS, async () => {
    const [agg, recentSummaries] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId },
        _count: true,
        _min: { date: true },
        _max: { date: true },
      }),
      prisma.spendingSummary.findMany({
        where: { userId },
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 18,
        select: { year: true, month: true, category: true, total: true },
      }),
    ]);

    const txCount = agg._count;
    const oldest = agg._min.date;
    const newest = agg._max.date;

    if (txCount === 0 || !oldest || !newest) {
      return { txCount: 0, dataContext: "No transactions imported yet." };
    }

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

    const newestMonth = newest.getMonth() + 1;
    const newestYear = newest.getFullYear();
    const oldestMonth = oldest.getMonth() + 1;
    const oldestYear = oldest.getFullYear();
    const monthsOfData = (newestYear - oldestYear) * 12 + (newestMonth - oldestMonth) + 1;

    const dataContext = [
      `Transactions: ${txCount}`,
      `Data range: ${oldestYear}-${String(oldestMonth).padStart(2, "0")} → ${newestYear}-${String(newestMonth).padStart(2, "0")} (${monthsOfData} month${monthsOfData !== 1 ? "s" : ""})`,
      `Most recent month for queries: ${newestYear}-${String(newestMonth).padStart(2, "0")}`,
      `Monthly totals (newest first): ${monthList}`,
    ].join("\n");

    return { txCount, dataContext };
  });
}

export function invalidateDataOverview(userId: string): void {
  invalidateUserCache(userId);
}
