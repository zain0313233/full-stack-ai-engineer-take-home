import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserBySupabaseId } from "@/lib/db/users";
import { getBudgets, upsertBudget, deleteBudget } from "@/lib/db/budgets";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return getUserBySupabaseId(user.id);
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const budgets = await getBudgets(user.id);
  return NextResponse.json(budgets);
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { category, amount, period } = await req.json();
  if (!category || !amount) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const budget = await upsertBudget(user.id, category, parseFloat(amount), period ?? "monthly");
  return NextResponse.json(budget);
}

export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const category = req.nextUrl.searchParams.get("category");
  if (!category) return NextResponse.json({ error: "Missing category" }, { status: 400 });
  await deleteBudget(user.id, category);
  return NextResponse.json({ ok: true });
}
