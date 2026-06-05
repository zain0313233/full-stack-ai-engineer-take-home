"use client";

import { ChatMarkdown } from "./ChatMarkdown";
import { TrendingUp, User } from "lucide-react";

interface Props {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
}

export function ChatMessage({ role, content, imageUrl }: Props) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""} chat-slide-up`}>
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: isUser ? "var(--fin-accent-2)" : "var(--fin-accent)",
        }}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <TrendingUp className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Bubble */}
      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Uploaded receipt"
            className="rounded-xl max-w-[280px] max-h-[220px] object-cover border"
            style={{ borderColor: "var(--fin-border-2)" }}
          />
        )}
        <div
          className="px-4 py-3 rounded-2xl text-sm"
          style={
            isUser
              ? {
                  background: "var(--fin-accent-2)",
                  color: "#fff",
                  borderBottomRightRadius: "4px",
                }
              : {
                  background: "var(--fin-card-2)",
                  color: "var(--fin-text)",
                  border: "1px solid var(--fin-border)",
                  borderBottomLeftRadius: "4px",
                }
          }
        >
          {isUser ? (
            <p className="text-sm leading-relaxed">{content}</p>
          ) : (
            <ChatMarkdown content={content} />
          )}
        </div>
      </div>
    </div>
  );
}
