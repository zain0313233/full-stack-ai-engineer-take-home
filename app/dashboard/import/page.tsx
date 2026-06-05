"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { TRANSACTIONS_KEY } from "@/hooks/useTransactions";
import { useDropzone } from "react-dropzone";
import {
  Upload, FileText, CheckCircle2, AlertCircle, RefreshCw,
  ArrowRight, Info, Landmark,
} from "lucide-react";
import { toast } from "sonner";

interface ImportResult {
  imported: number;
  skipped: number;
  recurring: number;
  anomalies: number;
  errors: string[];
  message?: string;
  source?: "csv" | "mock_bank";
  account?: { name: string; balance: number };
}

export default function ImportPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<"csv" | "mock" | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "text/plain": [".txt"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleImport = async () => {
    if (!file) return;
    setLoading("csv");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/transactions/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Import failed");
      } else {
        setResult({ ...data, source: "csv" });
        void queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
        toast.success(`Imported ${data.imported} transactions`);
      }
    } catch {
      toast.error("Network error during import");
    } finally {
      setLoading(null);
    }
  };

  const handleMockBankImport = async () => {
    setLoading("mock");
    setResult(null);
    try {
      const res = await fetch("/api/transactions/mock-bank-import", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Mock bank import failed");
      } else if (data.imported === 0) {
        setResult({ ...data, source: "mock_bank" });
        toast.info(data.message ?? "Mock bank already connected");
      } else {
        setResult({ ...data, source: "mock_bank" });
        void queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
        toast.success(`Connected mock bank — imported ${data.imported} transactions`);
      }
    } catch {
      toast.error("Network error connecting mock bank");
    } finally {
      setLoading(null);
    }
  };

  const downloadSample = () => {
    const csv = `Date,Description,Amount,Category
2024-01-05,Whole Foods Market,87.42,Groceries
2024-01-06,Netflix,15.99,Subscriptions
2024-01-07,Uber,12.50,Transport
2024-01-08,Chipotle,13.75,Dining
2024-01-09,Amazon,49.99,Shopping
2024-01-10,Spotify,9.99,Subscriptions
2024-01-12,Shell Gas Station,55.00,Transport
2024-01-14,Whole Foods Market,92.10,Groceries
2024-01-15,Salary Deposit,3500.00,Income
2024-01-16,Planet Fitness,24.99,Subscriptions
2024-01-18,CVS Pharmacy,18.40,Healthcare
2024-01-20,Starbucks,6.75,Dining
2024-01-22,Con Edison,110.00,Utilities
2024-01-24,Chipotle,14.25,Dining
2024-01-25,Target,67.88,Shopping
2024-01-28,Whole Foods Market,78.50,Groceries
2024-01-30,T-Mobile,45.00,Utilities
2024-02-05,Whole Foods Market,94.33,Groceries
2024-02-06,Netflix,15.99,Subscriptions
2024-02-07,Lyft,18.20,Transport
2024-02-10,Spotify,9.99,Subscriptions
2024-02-12,Shell Gas Station,58.00,Transport
2024-02-14,Whole Foods Market,83.00,Groceries
2024-02-15,Salary Deposit,3500.00,Income
2024-02-16,Planet Fitness,24.99,Subscriptions
2024-02-18,Walgreens,22.60,Healthcare
2024-02-19,Olive Garden,87.50,Dining
2024-02-22,Con Edison,98.00,Utilities
2024-02-24,Chipotle,13.50,Dining
2024-02-26,Apple Store,999.00,Shopping
2024-03-01,Whole Foods Market,91.20,Groceries
2024-03-06,Netflix,15.99,Subscriptions
2024-03-10,Spotify,9.99,Subscriptions
2024-03-14,Whole Foods Market,88.75,Groceries
2024-03-15,Salary Deposit,3500.00,Income
2024-03-16,Planet Fitness,24.99,Subscriptions
2024-03-20,Delta Airlines,420.00,Travel
2024-03-22,Con Edison,105.00,Utilities
2024-03-25,Airbnb,310.00,Travel
2024-03-28,Starbucks,7.25,Dining`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Import Transactions</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--fin-text-2)" }}>
          Upload a CSV from your bank, or connect the mock bank endpoint to pull live sample data.
        </p>
      </div>

      {/* Sample download banner */}
      <div
        className="flex items-center gap-3 p-4 rounded-xl text-sm"
        style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}
      >
        <Info className="w-4 h-4 flex-shrink-0" style={{ color: "var(--fin-accent-2)" }} />
        <p style={{ color: "var(--fin-text-2)" }}>
          Don&apos;t have a CSV?{" "}
          <button
            onClick={downloadSample}
            className="font-medium hover:underline"
            style={{ color: "var(--fin-accent-2)" }}
          >
            Download sample data
          </button>{" "}
          to try it out.
        </p>
      </div>

      {/* Mock bank connect */}
      <div
        className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
        style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)" }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(99,102,241,0.12)" }}
        >
          <Landmark className="w-6 h-6" style={{ color: "var(--fin-accent-2)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm">Connect Mock Bank</p>
          <p className="text-xs mt-1" style={{ color: "var(--fin-text-2)" }}>
            Pulls recent transactions from <code className="text-[11px]">GET /api/mock-bank</code> and saves them to your account.
            Safe to click again — duplicates are skipped.
          </p>
        </div>
        <button
          onClick={handleMockBankImport}
          disabled={loading !== null}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 flex-shrink-0"
          style={{ background: "var(--fin-accent-2)", color: "#fff" }}
        >
          {loading === "mock" ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Connecting…
            </>
          ) : (
            <>
              <Landmark className="w-4 h-4" />
              Connect mock bank
            </>
          )}
        </button>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className="rounded-2xl p-10 text-center cursor-pointer transition-all duration-150"
        style={{
          background: isDragActive ? "rgba(16,185,129,0.08)" : "var(--fin-card)",
          border: `2px dashed ${isDragActive ? "var(--fin-accent)" : "var(--fin-border-2)"}`,
        }}
      >
        <input {...getInputProps()} />
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: isDragActive ? "rgba(16,185,129,0.15)" : "var(--fin-card-2)" }}
        >
          <Upload className="w-7 h-7" style={{ color: isDragActive ? "var(--fin-accent)" : "var(--fin-muted)" }} />
        </div>

        {file ? (
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <FileText className="w-4 h-4" style={{ color: "var(--fin-accent)" }} />
              <p className="font-semibold text-white">{file.name}</p>
            </div>
            <p className="text-sm" style={{ color: "var(--fin-muted)" }}>
              {(file.size / 1024).toFixed(1)} KB — click or drag to replace
            </p>
          </div>
        ) : (
          <div>
            <p className="font-semibold text-white mb-1">
              {isDragActive ? "Drop your CSV here" : "Drag & drop your CSV file"}
            </p>
            <p className="text-sm" style={{ color: "var(--fin-muted)" }}>
              or click to browse — CSV up to 10 MB
            </p>
          </div>
        )}
      </div>

      {/* Supported formats note */}
      <div
        className="rounded-xl p-4 text-xs space-y-1.5"
        style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)" }}
      >
        <p className="font-medium text-white mb-2">Supported columns (any order, flexible names)</p>
        {[
          ["Date", "date, transaction date, posted date"],
          ["Merchant", "description, name, payee, memo, vendor"],
          ["Amount", "amount, debit, credit, sum"],
          ["Category", "category, type (optional — we auto-detect if missing)"],
        ].map(([label, aliases]) => (
          <div key={label} className="flex gap-2">
            <span className="w-20 flex-shrink-0 font-medium" style={{ color: "var(--fin-text)" }}>{label}</span>
            <span style={{ color: "var(--fin-muted)" }}>{aliases}</span>
          </div>
        ))}
      </div>

      {/* Import button */}
      {file && !result && (
        <button
          onClick={handleImport}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
          style={{ background: "var(--fin-accent)", color: "#fff" }}
        >
          {loading === "csv" ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Import {file.name}
            </>
          )}
        </button>
      )}

      {/* Result card */}
      {result && (
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)" }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6" style={{ color: "var(--fin-accent)" }} />
            <h3 className="font-semibold text-white text-lg">
              {result.source === "mock_bank" ? "Mock bank connected" : "Import complete"}
            </h3>
          </div>

          {result.message && (
            <p className="text-sm" style={{ color: "var(--fin-text-2)" }}>{result.message}</p>
          )}

          {result.account && (
            <p className="text-xs" style={{ color: "var(--fin-muted)" }}>
              {result.account.name} · balance ${result.account.balance.toLocaleString()}
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Imported", value: result.imported, color: "var(--fin-accent)" },
              { label: "Skipped", value: result.skipped, color: "var(--fin-muted)" },
              { label: "Recurring", value: result.recurring, color: "var(--fin-accent-2)" },
              { label: "Flagged", value: result.anomalies, color: "var(--fin-yellow)" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-xl p-3 text-center"
                style={{ background: "var(--fin-card-2)" }}
              >
                <p className="text-2xl font-bold tabular" style={{ color }}>{value}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--fin-muted)" }}>{label}</p>
              </div>
            ))}
          </div>

          {result.errors?.length > 0 && (
            <div
              className="rounded-lg p-3 text-xs space-y-1"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <div className="flex items-center gap-1.5 font-medium mb-1" style={{ color: "var(--fin-red)" }}>
                <AlertCircle className="w-3.5 h-3.5" />
                Some rows were skipped
              </div>
              {result.errors.map((e, i) => (
                <p key={i} style={{ color: "var(--fin-text-2)" }}>{e}</p>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => { setFile(null); setResult(null); setLoading(null); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: "var(--fin-card-2)", color: "var(--fin-text-2)", border: "1px solid var(--fin-border)" }}
            >
              <RefreshCw className="w-4 h-4" />
              Import another
            </button>
            <button
              onClick={() => router.push("/dashboard/chat")}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: "var(--fin-accent)", color: "#fff" }}
            >
              Ask AI about it
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
