"use client";

import Link from "next/link";
import { Upload, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import { formatCurrency, formatDate, CATEGORY_COLORS } from "@/lib/utils/formatters";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import {
  buildTransactionsHref,
  hasActiveFilters,
  TRANSACTIONS_PAGE_SIZE,
  type TransactionQueryParams,
} from "@/lib/transactions/filters";
import { useTransactions } from "@/hooks/useTransactions";
import type { TransactionsResponse } from "@/lib/transactions/fetch";

interface Props {
  initialData: TransactionsResponse;
  initialParams: TransactionQueryParams;
}

export function TransactionsView({ initialData, initialParams }: Props) {
  const {
    transactions,
    pagination,
    totalAccountTransactions,
    params,
    isLoading,
    isFetching,
    isPlaceholderData,
  } = useTransactions(initialData, initialParams);

  const filteredCount = pagination?.total ?? 0;
  const page = pagination?.page ?? 1;
  const totalPages = pagination?.totalPages ?? 1;
  const filtersActive = hasActiveFilters(params);
  const showTable = transactions.length > 0 || isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-sm mt-0.5 flex items-center gap-2" style={{ color: "var(--fin-text-2)" }}>
            <span>
              {totalAccountTransactions.toLocaleString()} total transactions · {TRANSACTIONS_PAGE_SIZE}{" "}
              per page
            </span>
            {isFetching && !isLoading && (
              <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--fin-accent)" }} />
            )}
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

      {totalAccountTransactions > 0 && (
        <TransactionFilters
          params={params}
          filteredCount={filteredCount}
          totalCount={totalAccountTransactions}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-12 rounded-xl" />
          ))}
        </div>
      ) : !showTable ? (
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
          className={`rounded-2xl overflow-hidden transition-opacity ${isPlaceholderData ? "opacity-70" : ""}`}
          style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    background: "var(--fin-card-2)",
                    borderBottom: "1px solid var(--fin-border)",
                  }}
                >
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
                          tx.category === "Income" ? "var(--fin-accent)" : "var(--fin-text)",
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
                            style={{
                              background: "rgba(16,185,129,0.12)",
                              color: "var(--fin-accent)",
                            }}
                          >
                            receipt
                          </span>
                        )}
                        {tx.isRecurring && (
                          <span
                            className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full"
                            style={{
                              background: "rgba(99,102,241,0.12)",
                              color: "var(--fin-accent-2)",
                            }}
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            recurring
                          </span>
                        )}
                        {tx.isAnomaly && (
                          <span
                            className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full"
                            style={{
                              background: "rgba(245,158,11,0.12)",
                              color: "var(--fin-yellow)",
                            }}
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
                {pagination?.hasPrev && (
                  <Link
                    href={buildTransactionsHref(params, { page: String(page - 1) })}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: "var(--fin-card-2)", color: "var(--fin-text-2)" }}
                  >
                    Previous
                  </Link>
                )}
                {pagination?.hasNext && (
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
