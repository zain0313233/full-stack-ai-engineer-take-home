import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserBySupabaseId } from "@/lib/db/users";
import type { User } from "@prisma/client";

export type AuthContext = {
  authUser: { id: string; email?: string | null };
  dbUser: User;
};

export async function requireAuth():
  Promise<{ ok: true; ctx: AuthContext } | { ok: false; response: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const dbUser = await getUserBySupabaseId(authUser.id);
  if (!dbUser) {
    return {
      ok: false,
      response: NextResponse.json({ error: "User not found" }, { status: 404 }),
    };
  }

  return {
    ok: true,
    ctx: {
      authUser: { id: authUser.id, email: authUser.email },
      dbUser,
    },
  };
}
