export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatShortDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function getMonthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString("en-US", { month: "long" });
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export const CATEGORIES = [
  "Groceries",
  "Dining",
  "Transport",
  "Entertainment",
  "Shopping",
  "Utilities",
  "Healthcare",
  "Subscriptions",
  "Travel",
  "Housing",
  "Income",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_COLORS: Record<string, string> = {
  Groceries:     "#10B981",
  Dining:        "#F59E0B",
  Transport:     "#6366F1",
  Entertainment: "#EC4899",
  Shopping:      "#8B5CF6",
  Utilities:     "#0EA5E9",
  Healthcare:    "#EF4444",
  Subscriptions: "#F97316",
  Travel:        "#14B8A6",
  Housing:       "#64748B",
  Income:        "#22C55E",
  Other:         "#6B7280",
};
