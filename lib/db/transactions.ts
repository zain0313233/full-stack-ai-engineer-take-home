import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export type TransactionFilter = {
  userId: string;
  category?: string;
  merchant?: string;
  source?: string;
  isRecurring?: boolean;
  isAnomaly?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
};

export function buildTransactionWhere(
  filter: Omit<TransactionFilter, "limit" | "offset">
): Prisma.TransactionWhereInput {
  const {
    userId,
    category,
    merchant,
    source,
    isRecurring,
    isAnomaly,
    startDate,
    endDate,
  } = filter;

  return {
    userId,
    ...(category && { category }),
    ...(merchant && { merchant: { contains: merchant, mode: "insensitive" } }),
    ...(source && { source }),
    ...(isRecurring !== undefined && { isRecurring }),
    ...(isAnomaly !== undefined && { isAnomaly }),
    ...(startDate || endDate
      ? {
          date: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          },
        }
      : {}),
  };
}

export async function getTransactions(filter: TransactionFilter) {
  const { limit = 50, offset = 0, ...rest } = filter;

  return prisma.transaction.findMany({
    where: buildTransactionWhere(rest),
    orderBy: { date: "desc" },
    take: limit,
    skip: offset,
  });
}

export async function countTransactions(filter: Omit<TransactionFilter, "limit" | "offset">) {
  return prisma.transaction.count({ where: buildTransactionWhere(filter) });
}

export async function getTransactionCount(userId: string) {
  return countTransactions({ userId });
}

export async function getRecurringTransactions(userId: string) {
  return prisma.transaction.findMany({
    where: { userId, isRecurring: true },
    orderBy: { amount: "desc" },
  });
}

export async function getAnomalousTransactions(userId: string, limit = 10) {
  return prisma.transaction.findMany({
    where: { userId, isAnomaly: true },
    orderBy: { date: "desc" },
    take: limit,
  });
}

export async function upsertSpendingSummary(
  userId: string,
  year: number,
  month: number,
  category: string,
  total: number,
  count: number
) {
  return prisma.spendingSummary.upsert({
    where: { userId_year_month_category: { userId, year, month, category } },
    create: { userId, year, month, category, total, count },
    update: { total, count },
  });
}

export async function incrementSpendingSummary(
  userId: string,
  year: number,
  month: number,
  category: string,
  amount: number
) {
  const existing = await prisma.spendingSummary.findUnique({
    where: { userId_year_month_category: { userId, year, month, category } },
  });

  if (!existing) {
    return prisma.spendingSummary.create({
      data: { userId, year, month, category, total: amount, count: 1 },
    });
  }

  return prisma.spendingSummary.update({
    where: { userId_year_month_category: { userId, year, month, category } },
    data: { total: existing.total + amount, count: existing.count + 1 },
  });
}

export async function getSpendingSummaries(
  userId: string,
  year?: number,
  month?: number
) {
  return prisma.spendingSummary.findMany({
    where: {
      userId,
      ...(year !== undefined && { year }),
      ...(month !== undefined && { month }),
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

export async function getCategoryTotals(userId: string, year: number, month: number) {
  return prisma.spendingSummary.findMany({
    where: { userId, year, month },
    orderBy: { total: "desc" },
  });
}

export async function createTransactionsBatch(
  userId: string,
  rows: Array<{
    date: Date;
    merchant: string;
    amount: number;
    category: string;
    description?: string;
    source?: string;
    rawData?: object;
    isRecurring?: boolean;
    isAnomaly?: boolean;
  }>
) {
  return prisma.transaction.createMany({
    data: rows.map((r) => ({ ...r, userId })),
    skipDuplicates: false,
  });
}
