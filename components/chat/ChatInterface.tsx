"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "ai/react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TrendingUp, Sparkles, Plus, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STARTER_PROMPTS = [
  "How much did I spend last month?",
  "What are my biggest expense categories?",
  "Do I have any unusual charges?",
  "Show me my recurring subscriptions",
  "Am I on track with my budgets?",
  "Where can I cut back on spending?",
];

interface Session {
  id: string;
  title: string | null;
  updatedAt: Date;
  _count: { messages: number };
}

interface Props {
  initialSessions: Session[];
}

export function ChatInterface({ initialSessions }: Props) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [imageQueue, setImageQueue] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, append, isLoading, setMessages } = useChat({
    api: "/api/chat",
    body: {
      sessionId: activeSessionId,
      imageBase64: imageQueue?.base64,
      imageMimeType: imageQueue?.mimeType,
    },
    onResponse: (res) => {
      const newSessionId = res.headers.get("X-Session-Id");
      if (newSessionId && !activeSessionId) {
        setActiveSessionId(newSessionId);
      }
      setImageQueue(null);
    },
    onError: () => toast.error("Something went wrong. Please try again."),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (text: string, base64?: string, mimeType?: string) => {
    if (base64 && mimeType) {
      const reader = new FileReader();
      setImageQueue({ base64, mimeType, preview: `data:${mimeType};base64,${base64}` });
    }
    await append({ role: "user", content: text });
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveSessionId(null);
    setImageQueue(null);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-theme(spacing.28))] min-h-0 gap-4">
      {/* Session sidebar */}
      <aside
        className="hidden lg:flex flex-col w-60 flex-shrink-0 rounded-2xl overflow-hidden"
        style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)" }}
      >
        <div className="p-3" style={{ borderBottom: "1px solid var(--fin-border)" }}>
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: "var(--fin-accent)", color: "#fff" }}
          >
            <Plus className="w-4 h-4" />
            New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {sessions.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: "var(--fin-text-3)" }}>
              No previous chats
            </p>
          ) : (
            <ul className="space-y-0.5">
              {sessions.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => {
                      setActiveSessionId(s.id);
                      setMessages([]);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl transition-all text-xs"
                    style={
                      activeSessionId === s.id
                        ? { background: "var(--fin-card-2)", color: "var(--fin-text)" }
                        : { color: "var(--fin-text-2)" }
                    }
                    onMouseEnter={(e) => {
                      if (activeSessionId !== s.id)
                        (e.currentTarget as HTMLElement).style.background = "var(--fin-card-2)";
                    }}
                    onMouseLeave={(e) => {
                      if (activeSessionId !== s.id)
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "var(--fin-muted)" }} />
                      <span className="truncate leading-relaxed">
                        {s.title ?? "New conversation"}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto rounded-2xl p-4 mb-3"
          style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border)" }}
        >
          {isEmpty ? (
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
              {messages.map((m, i) => (
                <ChatMessage
                  key={m.id ?? i}
                  role={m.role as "user" | "assistant"}
                  content={m.content}
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

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  );
}
