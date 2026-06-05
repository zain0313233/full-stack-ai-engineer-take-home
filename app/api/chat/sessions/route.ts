import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserBySupabaseId } from "@/lib/db/users";
import { getChatSessions } from "@/lib/db/chat";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await getUserBySupabaseId(authUser.id);
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const sessions = await getChatSessions(dbUser.id);
    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("[chat/sessions]", err);
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }
}
