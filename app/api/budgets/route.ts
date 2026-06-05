import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { budgetSchema } from "@/lib/api/validation";
import { getBudgets, upsertBudget, deleteBudget } from "@/lib/db/budgets";
import { CATEGORIES } from "@/lib/utils/formatters";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const budgets = await getBudgets(auth.ctx.dbUser.id);
  return NextResponse.json(budgets);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = budgetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid budget data" }, { status: 400 });
  }

  const budget = await upsertBudget(
    auth.ctx.dbUser.id,
    parsed.data.category,
    parsed.data.amount,
    parsed.data.period ?? "monthly"
  );
  return NextResponse.json(budget);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const category = req.nextUrl.searchParams.get("category");
  if (!category || !CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  await deleteBudget(auth.ctx.dbUser.id, category);
  return NextResponse.json({ ok: true });
}
