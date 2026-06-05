import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserBySupabaseId } from "@/lib/db/users";
import { getUserMemory, setUserMemory } from "@/lib/db/memory";
import { prisma } from "@/lib/db/prisma";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return getUserBySupabaseId(user.id);
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({}, { status: 401 });
  const memory = await getUserMemory(user.id);
  return NextResponse.json(memory);
}

export async function DELETE(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
  await prisma.userMemory.deleteMany({ where: { userId: user.id, key } });
  return NextResponse.json({ ok: true });
}
