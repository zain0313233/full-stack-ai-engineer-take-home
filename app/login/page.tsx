"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--fin-bg)" }}
    >
      {/* Left — branding panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] p-12"
        style={{ background: "var(--fin-surface)", borderRight: "1px solid var(--fin-border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--fin-accent)" }}
          >
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold text-lg">Finance AI</span>
        </div>

        <div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
            style={{ background: "rgba(16,185,129,0.12)", color: "var(--fin-accent)", border: "1px solid rgba(16,185,129,0.2)" }}
          >
            <Sparkles className="w-3 h-3" />
            AI-Powered Insights
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Your money,<br />finally explained.
          </h1>
          <p className="text-lg" style={{ color: "var(--fin-text-2)" }}>
            Chat with your finances in plain English. Upload receipts, track budgets,
            and get personalised insights — all in one place.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Spending insights", desc: "Know where every dollar goes" },
            { label: "Smart budgets", desc: "Get alerts before you overspend" },
            { label: "Receipt scanning", desc: "Photo → logged expense instantly" },
            { label: "Long-term trends", desc: "Compare months and years" },
          ].map((f) => (
            <div
              key={f.label}
              className="p-4 rounded-xl"
              style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)" }}
            >
              <p className="text-sm font-semibold text-white mb-1">{f.label}</p>
              <p className="text-xs" style={{ color: "var(--fin-text-2)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "var(--fin-accent)" }}
            >
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold">Finance AI</span>
          </div>

          <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
          <p className="mb-8" style={{ color: "var(--fin-text-2)" }}>
            Sign in to your account to continue
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--fin-text-2)" }}>
                Email address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--fin-muted)" }}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "var(--fin-card)",
                    border: "1px solid var(--fin-border-2)",
                    color: "var(--fin-text)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--fin-accent)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--fin-border-2)")}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--fin-text-2)" }}>
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--fin-muted)" }}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "var(--fin-card)",
                    border: "1px solid var(--fin-border-2)",
                    color: "var(--fin-text)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--fin-accent)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--fin-border-2)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--fin-muted)" }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-150 disabled:opacity-60"
              style={{ background: "var(--fin-accent)", color: "#fff" }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-sm" style={{ color: "var(--fin-text-2)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" style={{ color: "var(--fin-accent)" }} className="font-medium hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
