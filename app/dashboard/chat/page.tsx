import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserBySupabaseId } from "@/lib/db/users";
import { getChatSessions } from "@/lib/db/chat";
import { ChatInterface } from "@/components/chat/ChatInterface";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const dbUser = await getUserBySupabaseId(authUser.id);
  if (!dbUser) redirect("/login");

  const sessions = await getChatSessions(dbUser.id);

  return (
    <div className="h-full">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">AI Assistant</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--fin-text-2)" }}>
          Ask anything about your finances — or upload a receipt photo
        </p>
      </div>
      <ChatInterface initialSessions={sessions} />
    </div>
  );
}
