import Papa from "papaparse";
import { CATEGORIES } from "./formatters";

export interface ParsedTransaction {
  date: Date;
  merchant: string;
  amount: number;
  category: string;
  description?: string;
  source: string;
  rawData: object;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  skipped: number;
  errors: string[];
}

// Flexible header aliases — handles many real-world CSV formats
const DATE_KEYS = ["date", "transaction date", "trans date", "posted date", "datetime", "time"];
const MERCHANT_KEYS = ["merchant", "name", "description", "payee", "vendor", "transaction", "details", "memo"];
const AMOUNT_KEYS = ["amount", "debit", "credit", "sum", "value", "transaction amount"];
const CATEGORY_KEYS = ["category", "type", "merchant category", "transaction type"];

function findKey(headers: string[], aliases: string[]): string | null {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const alias of aliases) {
    const idx = lower.findIndex((h) => h.includes(alias));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

function parseAmount(raw: string): number | null {
  if (!raw) return null;
  // Strip currency symbols, commas, parentheses (negative)
  const clean = raw.replace(/[£€$,\s]/g, "").replace(/\((.+)\)/, "-$1");
  const n = parseFloat(clean);
  return isNaN(n) ? null : Math.abs(n);
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  // Try common formats: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, DD-MMM-YY
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})/, // ISO
    /^(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
    /^(\d{2})-(\d{2})-(\d{4})/, // MM-DD-YYYY
  ];
  for (const fmt of formats) {
    const m = raw.match(fmt);
    if (m) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d;
    }
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeCategory(raw?: string): string {
  if (!raw) return "Other";
  const lower = raw.toLowerCase();
  const map: Record<string, string> = {
    grocery: "Groceries", groceries: "Groceries", supermarket: "Groceries",
    restaurant: "Dining", dining: "Dining", food: "Dining", "fast food": "Dining", cafe: "Dining",
    transport: "Transport", uber: "Transport", lyft: "Transport", gas: "Transport", fuel: "Transport", parking: "Transport",
    entertainment: "Entertainment", movie: "Entertainment", netflix: "Subscriptions", spotify: "Subscriptions",
    shopping: "Shopping", amazon: "Shopping", retail: "Shopping",
    utilities: "Utilities", electric: "Utilities", water: "Utilities", internet: "Utilities", phone: "Utilities",
    health: "Healthcare", medical: "Healthcare", pharmacy: "Healthcare", doctor: "Healthcare",
    subscription: "Subscriptions",
    travel: "Travel", hotel: "Travel", flight: "Travel", airbnb: "Travel",
    rent: "Housing", mortgage: "Housing", housing: "Housing",
    salary: "Income", payroll: "Income", income: "Income", deposit: "Income",
  };
  for (const [key, cat] of Object.entries(map)) {
    if (lower.includes(key)) return cat;
  }
  // Check if it already matches a known category
  const match = CATEGORIES.find((c) => c.toLowerCase() === lower);
  return match ?? "Other";
}

function deduplicateTransactions(txs: ParsedTransaction[]): ParsedTransaction[] {
  const seen = new Set<string>();
  return txs.filter((tx) => {
    const key = `${tx.date.toISOString().slice(0, 10)}-${tx.merchant}-${tx.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseCSV(raw: string): ParseResult {
  const errors: string[] = [];
  let skipped = 0;

  const parsed = Papa.parse<Record<string, string>>(raw, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    errors.push(...parsed.errors.slice(0, 5).map((e) => e.message));
  }

  const headers = parsed.meta.fields ?? [];
  const dateKey = findKey(headers, DATE_KEYS);
  const merchantKey = findKey(headers, MERCHANT_KEYS);
  const amountKey = findKey(headers, AMOUNT_KEYS);
  const categoryKey = findKey(headers, CATEGORY_KEYS);

  if (!dateKey || !merchantKey || !amountKey) {
    return {
      transactions: [],
      skipped: parsed.data.length,
      errors: [
        `Could not identify required columns. Found: ${headers.join(", ")}. ` +
          `Need columns for: date, merchant/description, amount.`,
      ],
    };
  }

  const transactions: ParsedTransaction[] = [];

  for (const row of parsed.data) {
    const rawDate = row[dateKey];
    const rawMerchant = row[merchantKey];
    const rawAmount = row[amountKey];

    const date = parseDate(rawDate);
    const amount = parseAmount(rawAmount);
    const merchant = rawMerchant?.trim();

    if (!date || amount === null || !merchant || merchant.length === 0) {
      skipped++;
      continue;
    }

    const rawCategory = categoryKey ? row[categoryKey] : undefined;
    const category = normalizeCategory(rawCategory ?? merchant);

    transactions.push({
      date,
      merchant,
      amount,
      category,
      description: merchant,
      source: "csv",
      rawData: row,
    });
  }

  return {
    transactions: deduplicateTransactions(transactions),
    skipped,
    errors,
  };
}
