import Link from "next/link";
import { formatCurrency, formatShortDate, CATEGORY_COLORS } from "@/lib/utils/formatters";
import { ArrowRight } from "lucide-react";

interface Transaction {
  id: string;
  date: Date;
  merchant: string;
  amount: number;
  category: string;
}

interface Props {
  transactions: Transaction[];
}

export function RecentTransactionsList({ transactions }: Props) {
  return (
    <div
      className="rounded-2xl"
      style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)" }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--fin-border)" }}
      >
        <h2 className="text-sm font-semibold text-white">Recent Transactions</h2>
        <Link
          href="/dashboard/transactions"
          className="flex items-center gap-1 text-xs transition-colors"
          style={{ color: "var(--fin-accent)" }}
        >
          View all
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm" style={{ color: "var(--fin-muted)" }}>
            No transactions this month
          </p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: "var(--fin-border)" }}>
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold flex-shrink-0"
                style={{
                  background: `${CATEGORY_COLORS[tx.category] ?? "#6B7280"}20`,
                  color: CATEGORY_COLORS[tx.category] ?? "#6B7280",
                }}
              >
                {tx.merchant.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{tx.merchant}</p>
                <p className="text-xs" style={{ color: "var(--fin-muted)" }}>
                  {tx.category} · {formatShortDate(tx.date)}
                </p>
              </div>
              <p
                className="text-sm font-semibold tabular"
                style={{ color: tx.category === "Income" ? "var(--fin-accent)" : "var(--fin-text)" }}
              >
                {tx.category === "Income" ? "+" : "-"}
                {formatCurrency(Math.abs(tx.amount))}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
