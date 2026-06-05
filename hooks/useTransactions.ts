"use client";

import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  buildTransactionsApiQuery,
  paramsFromSearchParams,
  paramsKey,
  type TransactionQueryParams,
} from "@/lib/transactions/filters";
import type { TransactionsResponse } from "@/lib/transactions/fetch";

export const TRANSACTIONS_KEY = "transactions";

async function fetchTransactionsApi(
  params: TransactionQueryParams
): Promise<TransactionsResponse> {
  const qs = buildTransactionsApiQuery(params);
  const res = await fetch(qs ? `/api/transactions?${qs}` : "/api/transactions");
  if (!res.ok) throw new Error("Failed to load transactions");
  return res.json();
}

export function useTransactions(
  initialData?: TransactionsResponse,
  initialParams?: TransactionQueryParams
) {
  const searchParams = useSearchParams();
  const params = paramsFromSearchParams(searchParams);
  const queryClient = useQueryClient();

  const isInitialView =
    initialData &&
    initialParams &&
    paramsKey(params) === paramsKey(initialParams);

  const query = useQuery({
    queryKey: [TRANSACTIONS_KEY, paramsKey(params)],
    queryFn: () => fetchTransactionsApi(params),
    initialData: isInitialView ? initialData : undefined,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
  };

  return {
    data: query.data,
    transactions: query.data?.transactions ?? [],
    pagination: query.data?.pagination,
    totalAccountTransactions: query.data?.totalAccountTransactions ?? 0,
    params,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    error: query.error,
    invalidate,
  };
}
