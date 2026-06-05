"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Target } from "lucide-react";
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

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newCategory, setNewCategory] = useState("Groceries");
  const [newAmount, setNewAmount] = useState("");
  const [saving, setSaving] = useState(false);

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
    const res = await fetch(`/api/budgets?category=${encodeURIComponent(category)}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Budget removed");
      fetchData();
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Budgets</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--fin-text-2)" }}>
            Set monthly limits per category
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: "var(--fin-accent)", color: "#fff" }}
        >
          <Plus className="w-4 h-4" />
          Add budget
        </button>
      </div>

      {/* Add budget form */}
      {showForm && (
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border-2)" }}
        >
          <h3 className="font-semibold text-white">New budget</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--fin-text-2)" }}>
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
                {CATEGORIES.filter((c) => c !== "Income").map((c) => (
                  <option key={c} value={c} style={{ background: "var(--fin-card-2)" }}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--fin-text-2)" }}>
                Monthly limit ($)
              </label>
              <input
                type="number"
                min="1"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="e.g. 500"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: "var(--fin-card-2)",
                  border: "1px solid var(--fin-border-2)",
                  color: "var(--fin-text)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--fin-accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--fin-border-2)")}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-2 rounded-xl text-sm font-medium"
              style={{ background: "var(--fin-card-2)", color: "var(--fin-text-2)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 rounded-xl text-sm font-medium disabled:opacity-60"
              style={{ background: "var(--fin-accent)", color: "#fff" }}
            >
              {saving ? "Saving…" : "Save budget"}
            </button>
          </div>
        </div>
      )}

      {/* Budget list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)" }}
        >
          <Target className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--fin-muted)" }} />
          <p className="text-white font-medium mb-1">No budgets set</p>
          <p className="text-sm" style={{ color: "var(--fin-muted)" }}>
            Click &ldquo;Add budget&rdquo; to start tracking your spending limits
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((b) => {
            const spent = spendMap[b.category] ?? 0;
            const pct = Math.min((spent / b.amount) * 100, 100);
            const over = spent > b.amount;
            const warn = pct >= 80 && !over;
            const barColor = over ? "var(--fin-red)" : warn ? "var(--fin-yellow)" : "var(--fin-accent)";

            return (
              <div
                key={b.id}
                className="p-5 rounded-2xl"
                style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{
                        background: `${CATEGORY_COLORS[b.category] ?? "#6B7280"}18`,
                        color: CATEGORY_COLORS[b.category] ?? "#6B7280",
                      }}
                    >
                      {b.category.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{b.category}</p>
                      <p className="text-xs" style={{ color: "var(--fin-muted)" }}>
                        {b.period} limit
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular" style={{ color: over ? "var(--fin-red)" : "var(--fin-text)" }}>
                        {formatCurrency(spent)}
                        <span style={{ color: "var(--fin-muted)", fontWeight: 400 }}>
                          {" "}/ {formatCurrency(b.amount)}
                        </span>
                      </p>
                      <p className="text-xs" style={{ color: over ? "var(--fin-red)" : "var(--fin-muted)" }}>
                        {over ? `Over by ${formatCurrency(spent - b.amount)}` : `${formatCurrency(b.amount - spent)} remaining`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(b.category)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: "var(--fin-muted)" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--fin-red)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--fin-muted)")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--fin-border-2)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
