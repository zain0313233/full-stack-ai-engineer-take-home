"use client";

import { useEffect, useRef, useState } from "react";
import { useChat, type Message } from "ai/react";
import { ChatMessage, type MessageAttachment } from "./ChatMessage";
import { ChatInput, type PendingAttachment } from "./ChatInput";
import { TrendingUp, Sparkles, Plus, MessageSquare, Trash2, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { useChatSessions, type ChatSession } from "@/hooks/useChatSessions";

const STARTER_PROMPTS = [
  "How much did I spend last month?",
  "What are my biggest expense categories?",
  "Do I have any unusual charges?",
  "Show me my recurring subscriptions",
  "Am I on track with my budgets?",
  "Where can I cut back on spending?",
];

interface Props {
  initialSessions: ChatSession[];
}

function groupSessionsByDate(sessions: ChatSession[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<string, ChatSession[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    Earlier: [],
  };

  for (const s of sessions) {
    const d = new Date(s.updatedAt);
    if (d >= today) groups.Today.push(s);
    else if (d >= yesterday) groups.Yesterday.push(s);
    else if (d >= weekAgo) groups["This Week"].push(s);
    else groups.Earlier.push(s);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

function isFailedAssistantMessage(content: string) {
  const trimmed = content.trim();
  return !trimmed || trimmed === "An error occurred.";
}

function attachmentsFromMessage(m: Message): MessageAttachment[] | undefined {
  if (m.experimental_attachments?.length) {
    return m.experimental_attachments.map((a) => ({
      url: a.url,
      contentType: a.contentType,
      name: a.name,
    }));
  }
  return undefined;
}

function attachmentsFromMetadata(metadata: unknown): MessageAttachment[] | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const meta = metadata as {
    attachments?: MessageAttachment[];
    imageUrl?: string;
    hasImage?: boolean;
  };

  if (meta.attachments?.length) return meta.attachments;
  if (meta.imageUrl) {
    return [{ url: meta.imageUrl, contentType: "image/jpeg", name: "receipt" }];
  }
  return undefined;
}

export function ChatInterface({ initialSessions }: Props) {
  const { sessions, invalidate, upsertSession, removeSession } =
    useChatSessions(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, append, isLoading, setMessages } = useChat({
    api: "/api/chat",
    body: { sessionId: activeSessionId },
    onResponse: async (res) => {
      if (!res.ok) {
        let message = "Something went wrong. Please try again.";
        try {
          const data = await res.clone().json();
          if (typeof data?.error === "string") message = data.error;
        } catch {
          // non-JSON error body
        }
        toast.error(message);
        return;
      }
      const newSessionId = res.headers.get("X-Session-Id");
      if (newSessionId && newSessionId !== activeSessionId) {
        setActiveSessionId(newSessionId);
        const lastUser = messages[messages.length - 1];
        upsertSession({
          id: newSessionId,
          title: lastUser?.content?.slice(0, 50) || "New conversation",
          updatedAt: new Date().toISOString(),
        });
      }
    },
    onError: (err) => {
      console.error("[chat]", err);
      toast.error("Something went wrong. Please try again.");
    },
    onFinish: (message) => {
      if (message.role === "assistant" && isFailedAssistantMessage(message.content)) {
        toast.error("Something went wrong. Please try again.");
        setMessages((prev) => prev.filter((m) => m.id !== message.id || !isFailedAssistantMessage(m.content)));
      } else {
        invalidate();
      }
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const loadSession = async (sessionId: string) => {
    if (sessionId === activeSessionId && messages.length > 0) return;

    setLoadingSessionId(sessionId);
    setActiveSessionId(sessionId);
    setSidebarOpen(false);

    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not load this chat");
        return;
      }

      const loaded: Message[] = (data.session?.messages ?? []).map(
        (m: { id: string; role: string; content: string; metadata?: unknown }) => {
          const attachments = attachmentsFromMetadata(m.metadata);
          return {
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            experimental_attachments: attachments,
          };
        }
      );
      setMessages(loaded);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoadingSessionId(null);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await removeSession.mutateAsync(sessionId);
      toast.success("Chat deleted");

      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch {
      toast.error("Could not delete this chat");
    }
  };

  const handleSend = async (text: string, attachment?: PendingAttachment) => {
    const messageAttachments: MessageAttachment[] | undefined = attachment
      ? [{ url: attachment.url, contentType: attachment.contentType, name: attachment.name }]
      : undefined;

    await append(
      {
        role: "user",
        content: text,
        experimental_attachments: messageAttachments,
      },
      {
        body: {
          imageBase64: attachment?.base64,
          imageMimeType: attachment?.contentType,
          attachmentName: attachment?.name,
          attachmentDataUrl: attachment && !attachment.base64 ? attachment.url : undefined,
        },
      }
    );
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveSessionId(null);
    setSidebarOpen(false);
  };

  const isEmpty = messages.length === 0 && !loadingSessionId;
  const isLoadingSession = loadingSessionId !== null;

  const sidebar = (
    <aside
      className={`
        flex flex-col w-60 flex-shrink-0 rounded-2xl overflow-hidden
        lg:static fixed top-0 left-0 z-30 h-full lg:h-auto
        transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)" }}
    >
      <div className="p-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--fin-border)" }}>
        <button
          onClick={handleNewChat}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: "var(--fin-accent)", color: "#fff" }}
        >
          <Plus className="w-4 h-4" />
          New chat
        </button>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden ml-2 p-2 rounded-lg"
          style={{ color: "var(--fin-muted)" }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: "var(--fin-text-3)" }}>
            No previous chats
          </p>
        ) : (
          <div className="space-y-0.5">
            {groupSessionsByDate(sessions).map(({ label, items }) => (
              <div key={label}>
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider px-2 pt-3 pb-1.5"
                  style={{ color: "var(--fin-muted)" }}
                >
                  {label}
                </p>
                {items.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => void loadSession(s.id)}
                    onMouseEnter={() => setHoveredSessionId(s.id)}
                    onMouseLeave={() => setHoveredSessionId(null)}
                    className="relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                    style={
                      activeSessionId === s.id
                        ? { background: "var(--fin-card-2)", color: "var(--fin-text)" }
                        : { color: "var(--fin-text-2)" }
                    }
                  >
                    <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "var(--fin-muted)" }} />
                    <span className="flex-1 truncate text-xs leading-relaxed">
                      {s.title ?? "New conversation"}
                    </span>
                    {hoveredSessionId === s.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeleteSession(s.id);
                        }}
                        className="p-1 rounded transition-colors flex-shrink-0"
                        style={{ color: "var(--fin-muted)" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--fin-red)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--fin-muted)")}
                        title="Delete chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div className="flex h-[calc(100vh-theme(spacing.28))] min-h-0 gap-4 relative">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {sidebar}

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="lg:hidden mb-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
            style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)", color: "var(--fin-text-2)" }}
          >
            <Menu className="w-4 h-4" />
            Chat history
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto rounded-2xl p-4 mb-3"
          style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)" }}
        >
          {isLoadingSession ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--fin-text-2)" }}>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Loading chat…
              </div>
            </div>
          ) : isEmpty ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-6 py-8">
              <div>
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 accent-glow"
                  style={{ background: "rgba(16,185,129,0.15)" }}
                >
                  <TrendingUp className="w-8 h-8" style={{ color: "var(--fin-accent)" }} />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Finance AI</h2>
                <p className="text-sm max-w-sm" style={{ color: "var(--fin-text-2)" }}>
                  Ask me anything about your spending, budgets, or transactions.
                  I can also read receipt photos.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleSend(p)}
                    className="px-4 py-2.5 rounded-xl text-sm text-left transition-all"
                    style={{
                      background: "var(--fin-card-2)",
                      border: "1px solid var(--fin-border)",
                      color: "var(--fin-text-2)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--fin-accent)";
                      (e.currentTarget as HTMLElement).style.color = "var(--fin-text)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--fin-border)";
                      (e.currentTarget as HTMLElement).style.color = "var(--fin-text-2)";
                    }}
                  >
                    <Sparkles
                      className="w-3 h-3 inline-block mr-1.5 mb-0.5"
                      style={{ color: "var(--fin-accent)" }}
                    />
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages
                .filter((m) => m.role !== "assistant" || !isFailedAssistantMessage(m.content))
                .map((m, i) => (
                  <ChatMessage
                    key={m.id ?? i}
                    role={m.role as "user" | "assistant"}
                    content={m.content}
                    attachments={attachmentsFromMessage(m)}
                  />
                ))}

              {isLoading && (
                <div className="flex gap-3 chat-slide-up">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--fin-accent)" }}
                  >
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <div
                    className="px-4 py-3 rounded-2xl rounded-bl-[4px]"
                    style={{ background: "var(--fin-card-2)", border: "1px solid var(--fin-border)" }}
                  >
                    <div className="flex gap-1.5 items-center h-4">
                      {[0, 150, 300].map((delay) => (
                        <div
                          key={delay}
                          className="w-2 h-2 rounded-full chat-dot"
                          style={{
                            background: "var(--fin-accent)",
                            animationDelay: `${delay}ms`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <ChatInput onSend={handleSend} disabled={isLoading || isLoadingSession} />
      </div>
    </div>
  );
}
