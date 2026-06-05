import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { fetchTransactionsForUser } from "@/lib/transactions/fetch";
import { type TransactionQueryParams } from "@/lib/transactions/filters";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const sp = req.nextUrl.searchParams;
    const queryParams: TransactionQueryParams = {
      page: sp.get("page") ?? undefined,
      category: sp.get("category") ?? undefined,
      merchant: sp.get("merchant")?.slice(0, 100) ?? undefined,
      source: sp.get("source") ?? undefined,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
      recurring: sp.get("recurring") ?? undefined,
      anomaly: sp.get("anomaly") ?? undefined,
    };

    const data = await fetchTransactionsForUser(auth.ctx.dbUser.id, queryParams);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[transactions GET]", err);
    return NextResponse.json({ error: "Failed to load transactions" }, { status: 500 });
  }
}
