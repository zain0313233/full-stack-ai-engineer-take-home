"use client";

import { useState } from "react";
import { Menu, Bell, Search } from "lucide-react";
import { Sidebar } from "./Sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: { name?: string | null; email?: string | null } | null;
  title?: string;
}

export function DashboardLayout({ children, user, title }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "var(--fin-bg)" }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />

      <div className="lg:pl-64">
        {/* Top bar */}
        <header
          className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 h-15 py-3"
          style={{ background: "var(--fin-surface)", borderBottom: "1px solid var(--fin-border)" }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg transition-colors"
              style={{ color: "var(--fin-muted)" }}
            >
              <Menu className="w-5 h-5" />
            </button>
            {title && (
              <h1 className="text-base font-semibold text-white hidden sm:block">{title}</h1>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              className="relative p-2 rounded-lg transition-colors"
              style={{ color: "var(--fin-muted)" }}
            >
              <Bell className="w-5 h-5" />
            </button>

            {/* User avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ml-1"
              style={{ background: "var(--fin-accent-2)" }}
            >
              {(user?.name ?? user?.email ?? "U")
                .split(" ")
                .map((s) => s[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
