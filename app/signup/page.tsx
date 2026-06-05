"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, Mail, Lock, Eye, EyeOff, User, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! Redirecting to dashboard…");
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--fin-bg)" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--fin-accent)" }}
          >
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold text-lg">Finance AI</span>
        </div>

        <h2 className="text-3xl font-bold text-white mb-2">Create your account</h2>
        <p className="mb-8" style={{ color: "var(--fin-text-2)" }}>
          Start understanding your finances in minutes
        </p>

        <form onSubmit={handleSignup} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--fin-text-2)" }}>
              Full name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--fin-muted)" }} />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Johnson"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border-2)", color: "var(--fin-text)" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--fin-accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--fin-border-2)")}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--fin-text-2)" }}>
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--fin-muted)" }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border-2)", color: "var(--fin-text)" }}
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
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--fin-muted)" }} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full pl-10 pr-12 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border-2)", color: "var(--fin-text)" }}
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
                Create account
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-sm" style={{ color: "var(--fin-text-2)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--fin-accent)" }} className="font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
