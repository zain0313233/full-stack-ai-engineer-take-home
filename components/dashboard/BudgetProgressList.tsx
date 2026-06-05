import Link from "next/link";
import { formatCurrency } from "@/lib/utils/formatters";
import { Target, ArrowRight } from "lucide-react";

interface Budget {
  id: string;
  category: string;
  amount: number;
  period: string;
}

interface Summary {
  category: string;
  total: number;
}

interface Props {
  budgets: Budget[];
  categoryTotals: Summary[];
}

export function BudgetProgressList({ budgets, categoryTotals }: Props) {
  const spendMap = Object.fromEntries(categoryTotals.map((c) => [c.category, c.total]));

  return (
    <div
      className="rounded-2xl p-5 h-full flex flex-col"
      style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)" }}
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-white">Budgets</h2>
        <Link
          href="/dashboard/budgets"
          className="flex items-center gap-1 text-xs transition-colors"
          style={{ color: "var(--fin-accent)" }}
        >
          Manage
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {budgets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(16,185,129,0.1)" }}
          >
            <Target className="w-5 h-5" style={{ color: "var(--fin-accent)" }} />
          </div>
          <p className="text-sm font-medium text-white">No budgets yet</p>
          <Link
            href="/dashboard/budgets"
            className="text-xs font-medium"
            style={{ color: "var(--fin-accent)" }}
          >
            Set up budgets →
          </Link>
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto flex-1">
          {budgets.map((b) => {
            const spent = spendMap[b.category] ?? 0;
            const pct = Math.min((spent / b.amount) * 100, 100);
            const over = spent > b.amount;
            const warn = pct >= 80 && !over;

            const barColor = over
              ? "var(--fin-red)"
              : warn
              ? "var(--fin-yellow)"
              : "var(--fin-accent)";

            return (
              <div key={b.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-white">{b.category}</span>
                  <span
                    className="text-xs tabular"
                    style={{ color: over ? "var(--fin-red)" : "var(--fin-text-2)" }}
                  >
                    {formatCurrency(spent)} / {formatCurrency(b.amount)}
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--fin-border-2)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, background: barColor }}
                  />
                </div>
                {over && (
                  <p className="text-[11px] mt-1" style={{ color: "var(--fin-red)" }}>
                    Over by {formatCurrency(spent - b.amount)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
