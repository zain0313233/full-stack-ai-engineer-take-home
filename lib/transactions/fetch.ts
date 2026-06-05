import {
  countTransactions,
  getTransactionCount,
  getTransactions,
} from "@/lib/db/transactions";
import {
  parseTransactionQuery,
  TRANSACTIONS_PAGE_SIZE,
  type TransactionQueryParams,
} from "./filters";

export type TransactionRow = {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  source: string;
  isRecurring: boolean;
  isAnomaly: boolean;
};

export type TransactionsResponse = {
  transactions: TransactionRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  totalAccountTransactions: number;
};

function serializeTransaction(tx: {
  id: string;
  date: Date;
  merchant: string;
  amount: number;
  category: string;
  source: string;
  isRecurring: boolean;
  isAnomaly: boolean;
}): TransactionRow {
  return {
    id: tx.id,
    date: tx.date.toISOString(),
    merchant: tx.merchant,
    amount: tx.amount,
    category: tx.category,
    source: tx.source,
    isRecurring: tx.isRecurring,
    isAnomaly: tx.isAnomaly,
  };
}

export async function fetchTransactionsForUser(
  userId: string,
  params: TransactionQueryParams
): Promise<TransactionsResponse> {
  let query = parseTransactionQuery(userId, params);

  const [filteredCount, totalAccountTransactions] = await Promise.all([
    countTransactions(query),
    getTransactionCount(userId),
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredCount / TRANSACTIONS_PAGE_SIZE));
  const page = Math.min(query.page, totalPages);

  if (query.page !== page) {
    query = {
      ...query,
      page,
      offset: (page - 1) * TRANSACTIONS_PAGE_SIZE,
    };
  }

  const rows = await getTransactions(query);

  return {
    transactions: rows.map(serializeTransaction),
    pagination: {
      page,
      limit: TRANSACTIONS_PAGE_SIZE,
      total: filteredCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    totalAccountTransactions,
  };
}
