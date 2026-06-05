"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface ChatSession {
  id: string;
  title: string | null;
  updatedAt: string | Date;
}

const SESSIONS_KEY = ["chat-sessions"] as const;

async function fetchChatSessions(): Promise<ChatSession[]> {
  const res = await fetch("/api/chat/sessions");
  if (!res.ok) throw new Error("Failed to load sessions");
  const data = await res.json();
  return data.sessions ?? [];
}

export function useChatSessions(initialSessions: ChatSession[]) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: fetchChatSessions,
    initialData: initialSessions,
    staleTime: 30_000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
  };

  const upsertSession = (session: ChatSession) => {
    queryClient.setQueryData<ChatSession[]>(SESSIONS_KEY, (prev = []) => {
      const rest = prev.filter((s) => s.id !== session.id);
      return [session, ...rest].slice(0, 30);
    });
  };

  const removeSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete session");
    },
    onSuccess: (_data, sessionId) => {
      queryClient.setQueryData<ChatSession[]>(SESSIONS_KEY, (prev = []) =>
        prev.filter((s) => s.id !== sessionId)
      );
    },
  });

  return {
    sessions: query.data ?? initialSessions,
    isLoading: query.isLoading,
    invalidate,
    upsertSession,
    removeSession,
  };
}
