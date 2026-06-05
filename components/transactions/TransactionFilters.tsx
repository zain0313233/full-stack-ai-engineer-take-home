"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, X, Filter } from "lucide-react";
import { CATEGORIES } from "@/lib/utils/formatters";
import {
  buildTransactionsHref,
  hasActiveFilters,
  type TransactionQueryParams,
} from "@/lib/transactions/filters";

const SOURCES = [
  { value: "", label: "All sources" },
  { value: "csv", label: "CSV import" },
  { value: "mock_bank", label: "Mock bank" },
  { value: "receipt", label: "Receipt" },
  { value: "manual", label: "Manual" },
] as const;

interface Props {
  params: TransactionQueryParams;
  filteredCount: number;
  totalCount: number;
}

export function TransactionFilters({ params, filteredCount, totalCount }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [merchant, setMerchant] = useState(params.merchant ?? "");
  const [category, setCategory] = useState(params.category ?? "");
  const [source, setSource] = useState(params.source ?? "");
  const [from, setFrom] = useState(params.from ?? "");
  const [to, setTo] = useState(params.to ?? "");
  const [recurring, setRecurring] = useState(params.recurring === "1");
  const [anomaly, setAnomaly] = useState(params.anomaly === "1");

  const applyFilters = () => {
    const next: TransactionQueryParams = {
      merchant: merchant.trim() || undefined,
      category: category || undefined,
      source: source || undefined,
      from: from || undefined,
      to: to || undefined,
      recurring: recurring ? "1" : undefined,
      anomaly: anomaly ? "1" : undefined,
      page: "1",
    };

    startTransition(() => {
      router.push(buildTransactionsHref(next));
    });
  };

  const clearFilters = () => {
    setMerchant("");
    setCategory("");
    setSource("");
    setFrom("");
    setTo("");
    setRecurring(false);
    setAnomaly(false);
    startTransition(() => {
      router.push("/dashboard/transactions");
    });
  };

  const active = hasActiveFilters(params);

  return (
    <div
      className="rounded-2xl p-4 space-y-4"
      style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)" }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: "var(--fin-accent)" }} />
          <h2 className="text-sm font-semibold text-white">Filters</h2>
          {active && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full"
              style={{ background: "rgba(16,185,129,0.15)", color: "var(--fin-accent)" }}
            >
              Active
            </span>
          )}
        </div>
        <p className="text-xs" style={{ color: "var(--fin-muted)" }}>
          Showing {filteredCount.toLocaleString()} of {totalCount.toLocaleString()} transactions
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--fin-text-2)" }}>
            Search merchant
          </label>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
              style={{ color: "var(--fin-muted)" }}
            />
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              placeholder="e.g. Starbucks"
              className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none"
              style={{
                background: "var(--fin-card-2)",
                border: "1px solid var(--fin-border)",
                color: "var(--fin-text)",
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--fin-text-2)" }}>
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{
              background: "var(--fin-card-2)",
              border: "1px solid var(--fin-border)",
              color: "var(--fin-text)",
            }}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--fin-text-2)" }}>
            Source
          </label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{
              background: "var(--fin-card-2)",
              border: "1px solid var(--fin-border)",
              color: "var(--fin-text)",
            }}
          >
            {SOURCES.map((s) => (
              <option key={s.label} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--fin-text-2)" }}>
              From
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{
                background: "var(--fin-card-2)",
                border: "1px solid var(--fin-border)",
                color: "var(--fin-text)",
              }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--fin-text-2)" }}>
              To
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{
                background: "var(--fin-card-2)",
                border: "1px solid var(--fin-border)",
                color: "var(--fin-text)",
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--fin-text-2)" }}>
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="rounded"
            />
            Recurring only
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--fin-text-2)" }}>
            <input
              type="checkbox"
              checked={anomaly}
              onChange={(e) => setAnomaly(e.target.checked)}
              className="rounded"
            />
            Unusual only
          </label>
        </div>

        <div className="flex items-center gap-2">
          {active && (
            <button
              type="button"
              onClick={clearFilters}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-opacity disabled:opacity-50"
              style={{ background: "var(--fin-card-2)", color: "var(--fin-text-2)" }}
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={applyFilters}
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-xs font-medium transition-opacity disabled:opacity-50"
            style={{ background: "var(--fin-accent)", color: "#fff" }}
          >
            {isPending ? "Applying…" : "Apply filters"}
          </button>
        </div>
      </div>
    </div>
  );
}
