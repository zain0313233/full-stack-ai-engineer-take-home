import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserBySupabaseId } from "@/lib/db/users";
import { countTransactions, getTransactions } from "@/lib/db/transactions";
import {
  parseTransactionQuery,
  TRANSACTIONS_PAGE_SIZE,
  type TransactionQueryParams,
} from "@/lib/transactions/filters";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await getUserBySupabaseId(authUser.id);
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const sp = req.nextUrl.searchParams;
    const queryParams: TransactionQueryParams = {
      page: sp.get("page") ?? undefined,
      category: sp.get("category") ?? undefined,
      merchant: sp.get("merchant") ?? undefined,
      source: sp.get("source") ?? undefined,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
      recurring: sp.get("recurring") ?? undefined,
      anomaly: sp.get("anomaly") ?? undefined,
    };

    const query = parseTransactionQuery(dbUser.id, queryParams);
    const [transactions, total] = await Promise.all([
      getTransactions(query),
      countTransactions(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / TRANSACTIONS_PAGE_SIZE));

    return NextResponse.json({
      transactions,
      pagination: {
        page: query.page,
        limit: TRANSACTIONS_PAGE_SIZE,
        total,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
      filters: {
        category: query.category ?? null,
        merchant: query.merchant ?? null,
        source: query.source ?? null,
        from: queryParams.from ?? null,
        to: queryParams.to ?? null,
        recurring: query.isRecurring ?? false,
        anomaly: query.isAnomaly ?? false,
      },
    });
  } catch (err) {
    console.error("[transactions GET]", err);
    return NextResponse.json({ error: "Failed to load transactions" }, { status: 500 });
  }
}
