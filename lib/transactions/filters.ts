import type { TransactionFilter } from "@/lib/db/transactions";

export const TRANSACTIONS_PAGE_SIZE = 10;

export type TransactionQueryParams = {
  page?: string;
  category?: string;
  merchant?: string;
  source?: string;
  from?: string;
  to?: string;
  recurring?: string;
  anomaly?: string;
};

export type ParsedTransactionQuery = TransactionFilter & {
  page: number;
  totalPages: number;
};

function parseDateEnd(isoDate: string): Date {
  const d = new Date(isoDate);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function parseTransactionQuery(
  userId: string,
  params: TransactionQueryParams
): ParsedTransactionQuery {
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const merchant = params.merchant?.trim() || undefined;
  const category = params.category?.trim() || undefined;
  const source = params.source?.trim() || undefined;
  const startDate = params.from ? new Date(params.from) : undefined;
  const endDate = params.to ? parseDateEnd(params.to) : undefined;
  const isRecurring = params.recurring === "1" ? true : undefined;
  const isAnomaly = params.anomaly === "1" ? true : undefined;

  return {
    userId,
    page,
    category,
    merchant,
    source,
    startDate: startDate && !isNaN(startDate.getTime()) ? startDate : undefined,
    endDate: endDate && !isNaN(endDate.getTime()) ? endDate : undefined,
    isRecurring,
    isAnomaly,
    limit: TRANSACTIONS_PAGE_SIZE,
    offset: (page - 1) * TRANSACTIONS_PAGE_SIZE,
    totalPages: 1,
  };
}

export function buildTransactionsHref(
  params: TransactionQueryParams,
  overrides?: Partial<TransactionQueryParams>
): string {
  const merged = { ...params, ...overrides };
  const sp = new URLSearchParams();

  if (merged.page && merged.page !== "1") sp.set("page", merged.page);
  if (merged.category) sp.set("category", merged.category);
  if (merged.merchant) sp.set("merchant", merged.merchant);
  if (merged.source) sp.set("source", merged.source);
  if (merged.from) sp.set("from", merged.from);
  if (merged.to) sp.set("to", merged.to);
  if (merged.recurring === "1") sp.set("recurring", "1");
  if (merged.anomaly === "1") sp.set("anomaly", "1");

  const qs = sp.toString();
  return qs ? `/dashboard/transactions?${qs}` : "/dashboard/transactions";
}

export function hasActiveFilters(params: TransactionQueryParams): boolean {
  return !!(
    params.category ||
    params.merchant ||
    params.source ||
    params.from ||
    params.to ||
    params.recurring === "1" ||
    params.anomaly === "1"
  );
}
