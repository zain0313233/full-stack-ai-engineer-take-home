import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureDbUser } from "@/lib/db/users";
import { countTransactions, getTransactions, getTransactionCount } from "@/lib/db/transactions";
import { formatCurrency, formatDate, CATEGORY_COLORS } from "@/lib/utils/formatters";
import { Upload, RefreshCw, AlertTriangle } from "lucide-react";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import {
  buildTransactionsHref,
  hasActiveFilters,
  parseTransactionQuery,
  TRANSACTIONS_PAGE_SIZE,
  type TransactionQueryParams,
} from "@/lib/transactions/filters";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<TransactionQueryParams>;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const dbUser = await ensureDbUser(
    authUser.id,
    authUser.email!,
    authUser.user_metadata?.full_name ?? undefined
  );

  const params = await searchParams;
  let query = parseTransactionQuery(dbUser.id, params);

  const [filteredCount, totalCount] = await Promise.all([
    countTransactions(query),
    getTransactionCount(dbUser.id),
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredCount / TRANSACTIONS_PAGE_SIZE));
  const page = Math.min(query.page, totalPages);

  if (query.page > totalPages && filteredCount > 0) {
    redirect(buildTransactionsHref(params, { page: String(totalPages) }));
  }

  if (query.page !== page) {
    query = {
      ...query,
      page,
      offset: (page - 1) * TRANSACTIONS_PAGE_SIZE,
    };
  }

  const transactions = await getTransactions(query);
  const filtersActive = hasActiveFilters(params);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--fin-text-2)" }}>
            {totalCount.toLocaleString()} total transactions · {TRANSACTIONS_PAGE_SIZE} per page
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

      {totalCount > 0 && (
        <TransactionFilters
          params={params}
          filteredCount={filteredCount}
          totalCount={totalCount}
        />
      )}

      {transactions.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)" }}
        >
          <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--fin-muted)" }} />
          <p className="text-white font-medium mb-1">
            {filtersActive ? "No transactions match your filters" : "No transactions yet"}
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--fin-muted)" }}>
            {filtersActive
              ? "Try adjusting or clearing your filters"
              : "Import a CSV file to get started"}
          </p>
          {filtersActive ? (
            <Link
              href="/dashboard/transactions"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: "var(--fin-card-2)", color: "var(--fin-text)" }}
            >
              Clear filters
            </Link>
          ) : (
            <Link
              href="/dashboard/import"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: "var(--fin-accent)", color: "#fff" }}
            >
              Import now
            </Link>
          )}
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
                      <div className="flex gap-1.5 flex-wrap">
                        {tx.source === "receipt" && (
                          <span
                            className="text-[11px] px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(16,185,129,0.12)", color: "var(--fin-accent)" }}
                          >
                            receipt
                          </span>
                        )}
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

          {totalPages > 1 && (
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderTop: "1px solid var(--fin-border)" }}
            >
              <p className="text-xs" style={{ color: "var(--fin-muted)" }}>
                Page {page} of {totalPages} · {filteredCount.toLocaleString()} result
                {filteredCount !== 1 ? "s" : ""}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={buildTransactionsHref(params, { page: String(page - 1) })}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: "var(--fin-card-2)", color: "var(--fin-text-2)" }}
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={buildTransactionsHref(params, { page: String(page + 1) })}
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
