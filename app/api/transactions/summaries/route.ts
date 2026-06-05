import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserBySupabaseId } from "@/lib/db/users";
import { getSpendingSummaries } from "@/lib/db/transactions";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await getUserBySupabaseId(user.id);
  if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const summaries = await getSpendingSummaries(dbUser.id, now.getFullYear(), now.getMonth() + 1);
  return NextResponse.json(summaries);
}
