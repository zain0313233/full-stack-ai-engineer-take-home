import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: string; up: boolean };
}

export function StatsCard({
  label,
  value,
  subtext,
  icon: Icon,
  iconColor = "var(--fin-accent)",
  iconBg = "rgba(16,185,129,0.12)",
  trend,
}: StatsCardProps) {
  return (
    <div
      className="p-5 rounded-2xl flex flex-col gap-4"
      style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)" }}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
        {trend && (
          <span
            className="text-xs font-medium px-2 py-1 rounded-full"
            style={{
              background: trend.up
                ? "rgba(16,185,129,0.1)"
                : "rgba(239,68,68,0.1)",
              color: trend.up ? "var(--fin-accent)" : "var(--fin-red)",
            }}
          >
            {trend.up ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-medium mb-1" style={{ color: "var(--fin-text-2)" }}>
          {label}
        </p>
        <p className="text-2xl font-bold text-white tabular">{value}</p>
        {subtext && (
          <p className="text-xs mt-1" style={{ color: "var(--fin-muted)" }}>
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}
