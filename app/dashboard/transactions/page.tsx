import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserBySupabaseId } from "@/lib/db/users";
import { getTransactions, getTransactionCount } from "@/lib/db/transactions";
import { formatCurrency, formatDate, CATEGORY_COLORS } from "@/lib/utils/formatters";
import { Upload, RefreshCw, AlertTriangle } from "lucide-react";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const dbUser = await getUserBySupabaseId(authUser.id);
  if (!dbUser) redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const category = params.category;
  const PAGE_SIZE = 30;

  const [transactions, totalCount] = await Promise.all([
    getTransactions({
      userId: dbUser.id,
      category: category || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    getTransactionCount(dbUser.id),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--fin-text-2)" }}>
            {totalCount.toLocaleString()} total transactions
          </p>
        </div>
        <Link
          href="/dashboard/import"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: "var(--fin-accent)", color: "#fff" }}
        >
          <Upload className="w-4 h-4" />
          Import CSV
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)" }}
        >
          <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--fin-muted)" }} />
          <p className="text-white font-medium mb-1">No transactions yet</p>
          <p className="text-sm mb-4" style={{ color: "var(--fin-muted)" }}>
            Import a CSV file to get started
          </p>
          <Link
            href="/dashboard/import"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: "var(--fin-accent)", color: "#fff" }}
          >
            Import now
          </Link>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--fin-card-2)", borderBottom: "1px solid var(--fin-border)" }}>
                  {["Date", "Merchant", "Category", "Amount", "Flags"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold"
                      style={{ color: "var(--fin-text-2)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="tx-row transition-colors"
                    style={{ borderBottom: "1px solid var(--fin-border)" }}
                  >
                    <td className="px-4 py-3 tabular" style={{ color: "var(--fin-text-2)" }}>
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{tx.merchant}</td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: `${CATEGORY_COLORS[tx.category] ?? "#6B7280"}18`,
                          color: CATEGORY_COLORS[tx.category] ?? "#6B7280",
                        }}
                      >
                        {tx.category}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 font-semibold tabular"
                      style={{
                        color:
                          tx.category === "Income"
                            ? "var(--fin-accent)"
                            : "var(--fin-text)",
                      }}
                    >
                      {tx.category === "Income" ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {tx.isRecurring && (
                          <span
                            className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(99,102,241,0.12)", color: "var(--fin-accent-2)" }}
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            recurring
                          </span>
                        )}
                        {tx.isAnomaly && (
                          <span
                            className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(245,158,11,0.12)", color: "var(--fin-yellow)" }}
                          >
                            <AlertTriangle className="w-2.5 h-2.5" />
                            unusual
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderTop: "1px solid var(--fin-border)" }}
            >
              <p className="text-xs" style={{ color: "var(--fin-muted)" }}>
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/dashboard/transactions?page=${page - 1}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: "var(--fin-card-2)", color: "var(--fin-text-2)" }}
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/dashboard/transactions?page=${page + 1}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: "var(--fin-accent)", color: "#fff" }}
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
