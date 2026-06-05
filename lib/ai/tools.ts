import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getSpendingSummaries, getTransactions, getRecurringTransactions, getAnomalousTransactions } from "@/lib/db/transactions";
import { getBudgets } from "@/lib/db/budgets";
import { setUserMemory } from "@/lib/db/memory";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

// Build tool set bound to a specific user
export function buildTools(userId: string) {
  return {
    get_data_overview: tool({
      description: "Get date range and monthly totals. Call FIRST for any spending question without a specific date.",
      parameters: z.object({}),
      execute: async () => {
        const [oldest, newest, count, summaries] = await Promise.all([
          prisma.transaction.findFirst({ where: { userId }, orderBy: { date: "asc" }, select: { date: true } }),
          prisma.transaction.findFirst({ where: { userId }, orderBy: { date: "desc" }, select: { date: true } }),
          prisma.transaction.count({ where: { userId } }),
          prisma.spendingSummary.findMany({
            where: { userId },
            select: { year: true, month: true, total: true, category: true },
            orderBy: [{ year: "desc" }, { month: "desc" }],
          }),
        ]);

        if (count === 0) return "No data. Ask user to import CSV.";

        // Group by month, compact output
        const monthMap: Record<string, number> = {};
        for (const s of summaries) {
          if (s.category === "Income") continue;
          const k = `${s.year}-${String(s.month).padStart(2, "0")}`;
          monthMap[k] = (monthMap[k] ?? 0) + s.total;
        }
        const months = Object.entries(monthMap)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .slice(0, 6)
          .map(([k, t]) => `${k}=$${Math.round(t)}`)
          .join(", ");

        return `${count} txns | ${oldest!.date.toISOString().slice(0,7)} to ${newest!.date.toISOString().slice(0,7)} | months: ${months}`;
      },
    }),

    query_transactions: tool({
      description: "Search/filter transactions by category, merchant, or date range.",
      parameters: z.object({
        category: z.string().optional().describe("Filter by category (e.g. 'Groceries')"),
        merchant: z.string().optional().describe("Filter by merchant name (partial match)"),
        startDate: z.string().optional().describe("ISO date string YYYY-MM-DD"),
        endDate: z.string().optional().describe("ISO date string YYYY-MM-DD"),
        limit: z.number().optional().default(20).describe("Max rows to return"),
        orderByAmount: z.boolean().optional().describe("Sort by amount descending"),
      }),
      execute: async ({ category, merchant, startDate, endDate, limit = 20, orderByAmount }) => {
        const txs = await prisma.transaction.findMany({
          where: {
            userId,
            ...(category && { category: { contains: category, mode: "insensitive" } }),
            ...(merchant && { merchant: { contains: merchant, mode: "insensitive" } }),
            ...((startDate || endDate) && {
              date: {
                ...(startDate && { gte: new Date(startDate) }),
                ...(endDate && { lte: new Date(endDate) }),
              },
            }),
          },
          orderBy: orderByAmount ? { amount: "desc" } : { date: "desc" },
          take: Math.min(limit, 50),
        });

        if (txs.length === 0) return "No transactions found.";

        const total = txs.reduce((s, t) => s + t.amount, 0);
        const rows = txs
          .map((t) => `${t.date.toISOString().slice(0,10)} ${t.merchant} $${t.amount} ${t.category}`)
          .join("\n");

        return `${txs.length} results, total=$${Math.round(total)}:\n${rows}`;
      },
    }),

    get_spending_summary: tool({
      description: "Get category spending totals for a month/year.",
      parameters: z.object({
        year: z.number().describe("4-digit year"),
        month: z.number().min(1).max(12).describe("Month number 1-12"),
        category: z.string().optional().describe("Filter to a specific category"),
      }),
      execute: async ({ year, month, category }) => {
        const summaries = await getSpendingSummaries(userId, year, month);
        const filtered = category
          ? summaries.filter((s) => s.category.toLowerCase().includes(category.toLowerCase()))
          : summaries;

        if (filtered.length === 0)
          return `No data for ${month}/${year}${category ? ` category=${category}` : ""}.`;

        const spending = filtered.filter((s) => s.category !== "Income").sort((a, b) => b.total - a.total);
        const totalSpend = spending.reduce((s, c) => s + c.total, 0);
        const income = filtered.find((s) => s.category === "Income");
        const lines = spending.map((s) => `${s.category}:$${Math.round(s.total)}`).join(", ");

        return `${month}/${year} total=$${Math.round(totalSpend)} | ${lines}${income ? ` | income=$${Math.round(income.total)}` : ""}`;
      },
    }),

    get_budget_status: tool({
      description: "Compare spending vs budget limits for a month.",
      parameters: z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      }),
      execute: async ({ year, month }) => {
        const [budgets, summaries] = await Promise.all([
          getBudgets(userId),
          getSpendingSummaries(userId, year, month),
        ]);

        if (budgets.length === 0)
          return "No budgets set. The user can set budgets in the Budgets section.";

        const spendMap = Object.fromEntries(summaries.map((s) => [s.category, s.total]));

        const lines = budgets.map((b) => {
          const spent = spendMap[b.category] ?? 0;
          const pct = ((spent / b.amount) * 100).toFixed(0);
          const status = spent > b.amount ? "OVER" : spent / b.amount > 0.8 ? "NEAR LIMIT" : "OK";
          return `${b.category}: ${formatCurrency(spent)} / ${formatCurrency(b.amount)} (${pct}%) — ${status}`;
        });

        return `Budget status for ${month}/${year}:\n${lines.join("\n")}`;
      },
    }),

    get_recurring_subscriptions: tool({
      description: "List recurring/subscription charges.",
      parameters: z.object({}),
      execute: async () => {
        let recurring = await getRecurringTransactions(userId);

        // Fallback for short history: subscription-category merchants still matter
        if (recurring.length === 0) {
          recurring = await prisma.transaction.findMany({
            where: { userId, category: { equals: "Subscriptions", mode: "insensitive" } },
            orderBy: { date: "desc" },
            take: 20,
          });
        }

        if (recurring.length === 0) return "No recurring charges detected.";

        // Group by merchant, pick latest
        const byMerchant: Record<string, typeof recurring[0]> = {};
        for (const tx of recurring) {
          if (!byMerchant[tx.merchant] || tx.date > byMerchant[tx.merchant].date) {
            byMerchant[tx.merchant] = tx;
          }
        }

        const list = Object.values(byMerchant)
          .sort((a, b) => b.amount - a.amount)
          .map((tx) => `${tx.merchant}: ${formatCurrency(tx.amount)}/mo (${tx.category})`)
          .join("\n");

        const monthlyTotal = Object.values(byMerchant).reduce((s, t) => s + t.amount, 0);

        return `Recurring subscriptions (${Object.keys(byMerchant).length} found):\n${list}\n\nEstimated monthly total: ${formatCurrency(monthlyTotal)}`;
      },
    }),

    get_anomalies: tool({
      description: "List unusual/anomalous transactions.",
      parameters: z.object({
        limit: z.number().optional().default(10),
      }),
      execute: async ({ limit = 10 }) => {
        const anomalies = await getAnomalousTransactions(userId, limit);
        if (anomalies.length === 0)
          return "No unusual transactions detected in recent data.";

        const lines = anomalies
          .map((t) => `${formatDate(t.date)} | ${t.merchant} | ${formatCurrency(t.amount)} | ${t.category}`)
          .join("\n");

        return `Flagged unusual transactions (${anomalies.length}):\n${lines}`;
      },
    }),

    search_web: tool({
      description: "Search web to identify an unknown merchant or charge.",
      parameters: z.object({
        query: z.string().describe("Search query, e.g. 'What is AMZN MKTP US charge on bank statement'"),
      }),
      execute: async ({ query }) => {
        try {
          const { tavily } = await import("@tavily/core");
          const client = tavily({ apiKey: process.env.TAVILY_API_KEY! });
          const result = await client.search(query, {
            maxResults: 3,
            searchDepth: "basic",
          });

          if (!result.results?.length) return "Could not find information about this charge online.";

          const snippets = result.results
            .slice(0, 3)
            .map((r: { title: string; content: string }) => `• ${r.title}: ${r.content.slice(0, 200)}`)
            .join("\n");

          return `Web search results for "${query}":\n${snippets}`;
        } catch (err) {
          return "Web search temporarily unavailable.";
        }
      },
    }),

    save_user_memory: tool({
      description: "Save a fact the user told you (pay date, salary, preferences).",
      parameters: z.object({
        key: z.string().describe("Short identifier, e.g. 'pay_date', 'salary', 'exclude_from_food'"),
        value: z.string().describe("The value to remember"),
      }),
      execute: async ({ key, value }) => {
        await setUserMemory(userId, key, value);
        return `Remembered: ${key} = ${value}`;
      },
    }),
  };
}
