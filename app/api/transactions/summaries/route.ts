import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { getSpendingSummaries } from "@/lib/db/transactions";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const now = new Date();
  const summaries = await getSpendingSummaries(
    auth.ctx.dbUser.id,
    now.getFullYear(),
    now.getMonth() + 1
  );
  return NextResponse.json(summaries);
}
