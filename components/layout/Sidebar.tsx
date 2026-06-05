"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  TrendingUp,
  LayoutDashboard,
  MessageSquare,
  CreditCard,
  Target,
  Settings,
  LogOut,
  X,
  Bell,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const NAV_ITEMS = [
  { path: "/dashboard",              label: "Overview",     icon: LayoutDashboard },
  { path: "/dashboard/chat",         label: "AI Assistant", icon: MessageSquare },
  { path: "/dashboard/transactions", label: "Transactions", icon: CreditCard },
  { path: "/dashboard/budgets",      label: "Budgets",      icon: Target },
  { path: "/dashboard/import",       label: "Import Data",  icon: Upload },
  { path: "/dashboard/settings",     label: "Settings",     icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  user: { name?: string | null; email?: string | null } | null;
}

export function Sidebar({ open, onClose, user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  };

  const initials = (user?.name ?? user?.email ?? "U")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--fin-surface)", borderRight: "1px solid var(--fin-border)" }}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--fin-border)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--fin-accent)" }}
            >
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm leading-tight">Finance AI</p>
              <p className="text-[11px] leading-tight" style={{ color: "var(--fin-accent)" }}>
                Personal Assistant
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md transition-colors"
            style={{ color: "var(--fin-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
              const isActive =
                path === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(path);
              return (
                <li key={path}>
                  <Link
                    href={path}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium"
                    style={
                      isActive
                        ? { background: "var(--fin-accent)", color: "#fff" }
                        : { color: "var(--fin-text-2)" }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLElement).style.background = "var(--fin-card-2)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User + logout */}
        <div className="p-3" style={{ borderTop: "1px solid var(--fin-border)" }}>
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1"
            style={{ background: "var(--fin-card)" }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: "var(--fin-accent-2)" }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name ?? "User"}</p>
              <p className="text-xs truncate" style={{ color: "var(--fin-muted)" }}>
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium transition-all duration-150"
            style={{ color: "var(--fin-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)";
              (e.currentTarget as HTMLElement).style.color = "#f87171";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--fin-muted)";
            }}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
}
