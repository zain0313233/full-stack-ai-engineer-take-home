import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserBySupabaseId } from "@/lib/db/users";
import { getCategoryTotals, getTransactions, getTransactionCount, getRecurringTransactions } from "@/lib/db/transactions";
import { getBudgets } from "@/lib/db/budgets";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { OverviewCharts } from "@/components/dashboard/OverviewCharts";
import { BudgetProgressList } from "@/components/dashboard/BudgetProgressList";
import { RecentTransactionsList } from "@/components/dashboard/RecentTransactionsList";
import {
  DollarSign,
  TrendingDown,
  CreditCard,
  RefreshCw,
  MessageSquare,
  Upload,
  ArrowRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const dbUser = await getUserBySupabaseId(authUser.id);
  if (!dbUser) redirect("/login");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  const [
    categoryTotals,
    recentTx,
    totalCount,
    recurring,
    budgets,
    lastMonthTotals,
  ] = await Promise.all([
    getCategoryTotals(dbUser.id, year, month),
    getTransactions({ userId: dbUser.id, startDate: startOfMonth, endDate: endOfMonth, limit: 5 }),
    getTransactionCount(dbUser.id),
    getRecurringTransactions(dbUser.id),
    getBudgets(dbUser.id),
    getCategoryTotals(dbUser.id, month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1),
  ]);

  const thisMonthTotal = categoryTotals
    .filter((c) => c.category !== "Income")
    .reduce((s, c) => s + c.total, 0);

  const lastMonthTotal = lastMonthTotals
    .filter((c) => c.category !== "Income")
    .reduce((s, c) => s + c.total, 0);

  const thisMonthIncome = categoryTotals.find((c) => c.category === "Income")?.total ?? 0;

  const trendPct =
    lastMonthTotal > 0
      ? Math.abs(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1)
      : null;
  const trendUp = thisMonthTotal < lastMonthTotal;

  const hasData = totalCount > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Good {getTimeGreeting()},{" "}
            {authUser.user_metadata?.full_name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--fin-text-2)" }}>
            {hasData
              ? `Here's your financial summary for ${new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}`
              : "Import your transactions to get started"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/import"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: "var(--fin-card-2)", color: "var(--fin-text-2)", border: "1px solid var(--fin-border)" }}
          >
            <Upload className="w-4 h-4" />
            Import
          </Link>
          <Link
            href="/dashboard/chat"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: "var(--fin-accent)", color: "#fff" }}
          >
            <MessageSquare className="w-4 h-4" />
            Ask AI
          </Link>
        </div>
      </div>

      {/* No-data onboarding */}
      {!hasData && (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: "var(--fin-card)", border: "1px dashed var(--fin-border-2)" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(16,185,129,0.1)" }}
          >
            <Upload className="w-7 h-7" style={{ color: "var(--fin-accent)" }} />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No transactions yet</h3>
          <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: "var(--fin-text-2)" }}>
            Import a CSV file or connect the mock bank endpoint to start getting insights
          </p>
          <Link
            href="/dashboard/import"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: "var(--fin-accent)", color: "#fff" }}
          >
            Import transactions
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Stats */}
      {hasData && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatsCard
              label="Spent this month"
              value={formatCurrency(thisMonthTotal)}
              subtext={trendPct ? `${trendUp ? "↓" : "↑"} ${trendPct}% vs last month` : undefined}
              icon={DollarSign}
              trend={trendPct ? { value: `${trendPct}%`, up: trendUp } : undefined}
            />
            <StatsCard
              label="Income this month"
              value={formatCurrency(thisMonthIncome)}
              subtext="Detected from transactions"
              icon={TrendingDown}
              iconColor="var(--fin-accent-2)"
              iconBg="rgba(99,102,241,0.12)"
            />
            <StatsCard
              label="Total transactions"
              value={totalCount.toLocaleString()}
              subtext="All time"
              icon={CreditCard}
              iconColor="#F59E0B"
              iconBg="rgba(245,158,11,0.12)"
            />
            <StatsCard
              label="Recurring subscriptions"
              value={recurring.length.toString()}
              subtext={
                recurring.length > 0
                  ? `${formatCurrency(recurring.reduce((s, r) => s + r.amount, 0))}/mo`
                  : "None detected"
              }
              icon={RefreshCw}
              iconColor="#EC4899"
              iconBg="rgba(236,72,153,0.12)"
            />
          </div>

          {/* Charts + Budget */}
          <div className="grid xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <OverviewCharts categoryTotals={categoryTotals} />
            </div>
            <div>
              <BudgetProgressList budgets={budgets} categoryTotals={categoryTotals} />
            </div>
          </div>

          {/* Recent transactions */}
          <RecentTransactionsList transactions={recentTx} />
        </>
      )}
    </div>
  );
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
