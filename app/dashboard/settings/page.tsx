"use client";

import { useState, useEffect } from "react";
import { Save, Brain, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Memory {
  key: string;
  value: string;
}

export default function SettingsPage() {
  const [memory, setMemory] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/memory")
      .then((r) => r.json())
      .then((data) => {
        setMemory(Object.entries(data).map(([key, value]) => ({ key, value: value as string })));
        setLoading(false);
      });
  }, []);

  const handleDelete = async (key: string) => {
    const res = await fetch(`/api/memory?key=${encodeURIComponent(key)}`, { method: "DELETE" });
    if (res.ok) {
      setMemory((m) => m.filter((e) => e.key !== key));
      toast.success("Memory cleared");
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--fin-text-2)" }}>
          Manage your AI assistant memory and preferences
        </p>
      </div>

      {/* AI Memory */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(16,185,129,0.12)" }}
          >
            <Brain className="w-4 h-4" style={{ color: "var(--fin-accent)" }} />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">AI Memory</p>
            <p className="text-xs" style={{ color: "var(--fin-muted)" }}>
              Facts the assistant has learned about you
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
          </div>
        ) : memory.length === 0 ? (
          <p className="text-sm py-3 text-center" style={{ color: "var(--fin-muted)" }}>
            No memories yet. Tell the assistant your pay date or preferences and it will remember.
          </p>
        ) : (
          <div className="space-y-2">
            {memory.map(({ key, value }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: "var(--fin-card-2)", border: "1px solid var(--fin-border)" }}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium" style={{ color: "var(--fin-accent)" }}>
                    {key}
                  </span>
                  <span className="text-xs ml-2" style={{ color: "var(--fin-text-2)" }}>
                    {value}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(key)}
                  className="p-1 rounded transition-colors flex-shrink-0"
                  style={{ color: "var(--fin-muted)" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--fin-red)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--fin-muted)")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mock bank note */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)" }}
      >
        <p className="font-semibold text-white text-sm mb-2">Mock Bank Endpoint</p>
        <p className="text-xs mb-3" style={{ color: "var(--fin-text-2)" }}>
          Use the <strong>Connect Mock Bank</strong> button on the Import Data page, or call the API directly:
        </p>
        <code
          className="block text-xs p-3 rounded-lg"
          style={{ background: "var(--fin-card-2)", color: "var(--fin-accent)", border: "1px solid var(--fin-border)" }}
        >
          GET /api/mock-bank
        </code>
      </div>
    </div>
  );
}
