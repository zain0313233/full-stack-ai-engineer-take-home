"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  Target,
  Wallet,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  X,
  PieChart,
} from "lucide-react";
import { CATEGORIES, CATEGORY_COLORS, formatCurrency } from "@/lib/utils/formatters";
import { toast } from "sonner";

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

function getBudgetStatus(spent: number, limit: number) {
  const pct = limit > 0 ? (spent / limit) * 100 : 0;
  if (spent > limit) return { label: "Over budget", tone: "over" as const, pct };
  if (pct >= 80) return { label: "Near limit", tone: "warn" as const, pct };
  return { label: "On track", tone: "ok" as const, pct };
}

const STATUS_STYLES = {
  ok: { bg: "rgba(16,185,129,0.12)", color: "var(--fin-accent)", icon: CheckCircle2 },
  warn: { bg: "rgba(245,158,11,0.12)", color: "var(--fin-yellow)", icon: AlertTriangle },
  over: { bg: "rgba(239,68,68,0.12)", color: "var(--fin-red)", icon: AlertTriangle },
};

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newCategory, setNewCategory] = useState("Groceries");
  const [newAmount, setNewAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const monthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [bRes, sRes] = await Promise.all([
      fetch("/api/budgets"),
      fetch("/api/transactions/summaries"),
    ]);
    if (bRes.ok) setBudgets(await bRes.json());
    if (sRes.ok) setSummaries(await sRes.json());
    setLoading(false);
  };

  const spendMap = Object.fromEntries(summaries.map((s) => [s.category, s.total]));

  const stats = useMemo(() => {
    let totalLimit = 0;
    let totalSpent = 0;
    let overCount = 0;
    let warnCount = 0;

    for (const b of budgets) {
      const spent = spendMap[b.category] ?? 0;
      totalLimit += b.amount;
      totalSpent += spent;
      const status = getBudgetStatus(spent, b.amount);
      if (status.tone === "over") overCount++;
      if (status.tone === "warn") warnCount++;
    }

    return {
      totalLimit,
      totalSpent,
      remaining: Math.max(totalLimit - totalSpent, 0),
      overCount,
      warnCount,
      overallPct: totalLimit > 0 ? Math.min((totalSpent / totalLimit) * 100, 100) : 0,
    };
  }, [budgets, spendMap]);

  const availableCategories = CATEGORIES.filter(
    (c) => c !== "Income" && !budgets.some((b) => b.category === c)
  );

  const handleSave = async () => {
    if (!newAmount || isNaN(parseFloat(newAmount))) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: newCategory, amount: parseFloat(newAmount) }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Budget saved");
      setShowForm(false);
      setNewAmount("");
      fetchData();
    } else {
      toast.error("Failed to save budget");
    }
  };

  const handleDelete = async (category: string) => {
    const res = await fetch(`/api/budgets?category=${encodeURIComponent(category)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Budget removed");
      fetchData();
    }
  };

  const canAddBudget = availableCategories.length > 0;

  const openForm = () => {
    if (availableCategories.length > 0) {
      setNewCategory(availableCategories[0]);
    }
    setShowForm(true);
  };

  const AddBudgetCard = ({
    variant = "compact",
  }: {
    variant?: "compact" | "large";
  }) => (
    <button
      type="button"
      onClick={openForm}
      disabled={!canAddBudget}
      className={`rounded-2xl flex flex-col items-center justify-center gap-2 text-center transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:border-emerald-500/50 ${
        variant === "large" ? "p-8 min-h-[200px]" : "p-4 min-h-[132px]"
      }`}
      style={{
        background: "rgba(16,185,129,0.04)",
        border: "1px dashed rgba(16,185,129,0.35)",
      }}
    >
      <div
        className={`rounded-xl flex items-center justify-center ${
          variant === "large" ? "w-12 h-12" : "w-9 h-9"
        }`}
        style={{ background: "rgba(16,185,129,0.12)" }}
      >
        <Plus
          className={variant === "large" ? "w-6 h-6" : "w-4 h-4"}
          style={{ color: "var(--fin-accent)" }}
        />
      </div>
      <div>
        <p className={`font-semibold text-white ${variant === "large" ? "text-sm" : "text-xs"}`}>
          Add budget
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--fin-muted)" }}>
          {canAddBudget
            ? `${availableCategories.length} categor${availableCategories.length === 1 ? "y" : "ies"} available`
            : "All categories covered"}
        </p>
      </div>
    </button>
  );

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(16,185,129,0.12)" }}
          >
            <Target className="w-4 h-4" style={{ color: "var(--fin-accent)" }} />
          </div>
          <span
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--fin-muted)" }}
          >
            {monthLabel}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white">Budgets</h1>
        <p className="text-sm mt-1" style={{ color: "var(--fin-text-2)" }}>
          Set monthly spending limits by category and track how close you are to each cap.
        </p>
      </div>

      {/* Summary stats + add budget at end */}
      {!loading && budgets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {[
            {
              label: "Total budgeted",
              value: formatCurrency(stats.totalLimit),
              sub: `${budgets.length} categor${budgets.length === 1 ? "y" : "ies"}`,
              icon: Wallet,
              color: "var(--fin-accent)",
              bg: "rgba(16,185,129,0.12)",
            },
            {
              label: "Spent this month",
              value: formatCurrency(stats.totalSpent),
              sub: `${stats.overallPct.toFixed(0)}% of total budget`,
              icon: TrendingUp,
              color: stats.overallPct >= 80 ? "var(--fin-yellow)" : "var(--fin-accent-2)",
              bg: stats.overallPct >= 80 ? "rgba(245,158,11,0.12)" : "rgba(99,102,241,0.12)",
            },
            {
              label: "Remaining",
              value: formatCurrency(stats.remaining),
              sub: stats.totalSpent > stats.totalLimit ? "Over total budget" : "Across all categories",
              icon: PieChart,
              color: "var(--fin-text)",
              bg: "rgba(148,163,184,0.1)",
            },
            {
              label: "Needs attention",
              value: String(stats.overCount + stats.warnCount),
              sub:
                stats.overCount + stats.warnCount === 0
                  ? "All budgets on track"
                  : `${stats.overCount} over · ${stats.warnCount} near limit`,
              icon: AlertTriangle,
              color: stats.overCount > 0 ? "var(--fin-red)" : "var(--fin-yellow)",
              bg:
                stats.overCount > 0 ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="p-4 rounded-2xl"
              style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)" }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: card.bg }}
              >
                <card.icon className="w-4 h-4" style={{ color: card.color }} />
              </div>
              <p className="text-[11px] font-medium mb-1" style={{ color: "var(--fin-text-2)" }}>
                {card.label}
              </p>
              <p className="text-xl font-bold text-white tabular">{card.value}</p>
              <p className="text-[11px] mt-1" style={{ color: "var(--fin-muted)" }}>
                {card.sub}
              </p>
            </div>
          ))}
          <AddBudgetCard />
        </div>
      )}

      {/* Add budget panel */}
      {showForm && (
        <div
          className="rounded-2xl p-6"
          style={{
            background: "var(--fin-card)",
            border: "1px solid var(--fin-border-2)",
            boxShadow: "0 0 0 1px rgba(16,185,129,0.08)",
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-white">Create budget</h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--fin-muted)" }}>
                One budget per category · resets monthly
              </p>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: "var(--fin-muted)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {availableCategories.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--fin-text-2)" }}>
              All categories already have a budget. Delete one to add another.
            </p>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-xs font-medium mb-2"
                    style={{ color: "var(--fin-text-2)" }}
                  >
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{
                      background: "var(--fin-card-2)",
                      border: "1px solid var(--fin-border-2)",
                      color: "var(--fin-text)",
                    }}
                  >
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-xs font-medium mb-2"
                    style={{ color: "var(--fin-text-2)" }}
                  >
                    Monthly limit
                  </label>
                  <div className="relative">
                    <span
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                      style={{ color: "var(--fin-muted)" }}
                    >
                      $
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      placeholder="500"
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm outline-none tabular"
                      style={{
                        background: "var(--fin-card-2)",
                        border: "1px solid var(--fin-border-2)",
                        color: "var(--fin-text)",
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: "var(--fin-card-2)", color: "var(--fin-text-2)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60"
                  style={{ background: "var(--fin-accent)", color: "#fff" }}
                >
                  {saving ? "Saving…" : "Save budget"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Budget list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-44 rounded-2xl" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div
          className="rounded-2xl p-14 text-center"
          style={{
            background: "var(--fin-card)",
            border: "1px dashed var(--fin-border-2)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(16,185,129,0.1)" }}
          >
            <Target className="w-7 h-7" style={{ color: "var(--fin-accent)" }} />
          </div>
          <p className="text-lg font-semibold text-white mb-2">No budgets yet</p>
          <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: "var(--fin-text-2)" }}>
            Create your first monthly limit to start tracking spending against your goals.
          </p>
          <button
            onClick={openForm}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: "var(--fin-accent)", color: "#fff" }}
          >
            <Plus className="w-4 h-4" />
            Create first budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {budgets.map((b) => {
            const spent = spendMap[b.category] ?? 0;
            const status = getBudgetStatus(spent, b.amount);
            const style = STATUS_STYLES[status.tone];
            const StatusIcon = style.icon;
            const barPct = Math.min(status.pct, 100);
            const barColor =
              status.tone === "over"
                ? "var(--fin-red)"
                : status.tone === "warn"
                  ? "var(--fin-yellow)"
                  : "var(--fin-accent)";
            const catColor = CATEGORY_COLORS[b.category] ?? "#6B7280";

            return (
              <div
                key={b.id}
                className={`p-5 rounded-2xl flex flex-col gap-4 transition-colors ${
                  budgets.length === 1 ? "xl:col-span-2" : ""
                }`}
                style={{
                  background: "var(--fin-card)",
                  border: `1px solid ${status.tone === "over" ? "rgba(239,68,68,0.25)" : "var(--fin-border)"}`,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{
                        background: `${catColor}20`,
                        color: catColor,
                        border: `1px solid ${catColor}30`,
                      }}
                    >
                      {b.category.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{b.category}</p>
                      <p className="text-xs capitalize" style={{ color: "var(--fin-muted)" }}>
                        {b.period} budget
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(b.category)}
                    className="p-2 rounded-lg transition-colors flex-shrink-0"
                    style={{ color: "var(--fin-muted)" }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.color = "var(--fin-red)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.color = "var(--fin-muted)")
                    }
                    title="Remove budget"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-2xl font-bold text-white tabular">
                      {formatCurrency(spent)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--fin-muted)" }}>
                      of {formatCurrency(b.amount)} limit
                    </p>
                  </div>
                  <span
                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ background: style.bg, color: style.color }}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium" style={{ color: "var(--fin-text-2)" }}>
                      {status.tone === "over"
                        ? `Over by ${formatCurrency(spent - b.amount)}`
                        : `${formatCurrency(Math.max(b.amount - spent, 0))} remaining`}
                    </span>
                    <span className="text-[11px] font-semibold tabular" style={{ color: barColor }}>
                      {status.pct.toFixed(0)}%
                    </span>
                  </div>
                  <div
                    className="h-2.5 rounded-full overflow-hidden"
                    style={{ background: "var(--fin-border-2)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${barPct}%`,
                        background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          <AddBudgetCard variant="large" />
        </div>
      )}
    </div>
  );
}
