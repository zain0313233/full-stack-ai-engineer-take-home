import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { memoryKeySchema } from "@/lib/api/validation";
import { getUserMemory } from "@/lib/db/memory";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const memory = await getUserMemory(auth.ctx.dbUser.id);
  return NextResponse.json(memory);
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const key = req.nextUrl.searchParams.get("key");
  const parsed = memoryKeySchema.safeParse(key);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid memory key" }, { status: 400 });
  }

  await prisma.userMemory.deleteMany({
    where: { userId: auth.ctx.dbUser.id, key: parsed.data },
  });
  return NextResponse.json({ ok: true });
}
