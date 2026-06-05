import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { deleteChatSession, getChatSession } from "@/lib/db/chat";

type RouteContext = { params: Promise<{ id: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
    }

    const session = await getChatSession(auth.ctx.dbUser.id, id);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    return NextResponse.json({
      session: {
        id: session.id,
        title: session.title,
        updatedAt: session.updatedAt,
        messages: session.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
          metadata: m.metadata,
        })),
      },
    });
  } catch (err) {
    console.error("[chat/sessions/:id GET]", err);
    return NextResponse.json({ error: "Failed to load chat" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
    }

    const session = await getChatSession(auth.ctx.dbUser.id, id);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    await deleteChatSession(id, auth.ctx.dbUser.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[chat/sessions/:id DELETE]", err);
    return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 });
  }
}
