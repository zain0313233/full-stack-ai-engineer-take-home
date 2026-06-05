"use client";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CATEGORY_COLORS, formatCurrency } from "@/lib/utils/formatters";

interface Summary {
  category: string;
  total: number;
  count: number;
}

interface Props {
  categoryTotals: Summary[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-lg text-sm"
      style={{ background: "var(--fin-card-2)", border: "1px solid var(--fin-border-2)", color: "var(--fin-text)" }}
    >
      <p className="font-medium mb-0.5">{payload[0].name}</p>
      <p style={{ color: "var(--fin-accent)" }}>{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

export function OverviewCharts({ categoryTotals }: Props) {
  const spending = categoryTotals
    .filter((c) => c.category !== "Income")
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const pieData = spending.map((c) => ({
    name: c.category,
    value: Math.round(c.total * 100) / 100,
    color: CATEGORY_COLORS[c.category] ?? "#6B7280",
  }));

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)" }}
    >
      <h2 className="text-sm font-semibold text-white mb-5">Spending by Category</h2>

      {spending.length === 0 ? (
        <div className="h-52 flex items-center justify-center">
          <p className="text-sm" style={{ color: "var(--fin-muted)" }}>
            No spending data for this month
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Bar chart */}
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={spending} layout="vertical" margin={{ left: 0, right: 16 }}>
              <XAxis
                type="number"
                tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                tick={{ fill: "var(--fin-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="category"
                width={90}
                tick={{ fill: "var(--fin-text-2)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {spending.map((entry) => (
                  <Cell
                    key={entry.category}
                    fill={CATEGORY_COLORS[entry.category] ?? "#6B7280"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Pie chart */}
          <div className="flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full mt-1">
              {pieData.slice(0, 6).map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="text-xs truncate" style={{ color: "var(--fin-text-2)" }}>
                    {d.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
