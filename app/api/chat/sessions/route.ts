import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { getChatSessions } from "@/lib/db/chat";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const sessions = await getChatSessions(auth.ctx.dbUser.id);
    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("[chat/sessions]", err);
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }
}
