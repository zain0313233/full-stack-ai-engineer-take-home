"use client";

import { ChatMarkdown } from "./ChatMarkdown";
import { TrendingUp, User, FileText } from "lucide-react";

export interface MessageAttachment {
  url: string;
  contentType?: string;
  name?: string;
}

interface Props {
  role: "user" | "assistant";
  content: string;
  attachments?: MessageAttachment[];
}

function isImageType(contentType?: string, url?: string) {
  if (contentType?.startsWith("image/")) return true;
  if (url?.startsWith("data:image/")) return true;
  return /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(url ?? "");
}

function attachmentLabel(att: MessageAttachment) {
  return att.name ?? (isImageType(att.contentType, att.url) ? "Image" : "Document");
}

export function ChatMessage({ role, content, attachments }: Props) {
  const isUser = role === "user";
  const hasAttachments = attachments && attachments.length > 0;
  const hasText = content.trim().length > 0;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""} chat-slide-up`}>
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

      <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        {hasAttachments && (
          <div className={`flex flex-wrap gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
            {attachments.map((att, i) =>
              isImageType(att.contentType, att.url) ? (
                <a
                  key={`${att.url}-${i}`}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl overflow-hidden border transition-opacity hover:opacity-90"
                  style={{ borderColor: "var(--fin-border-2)" }}
                >
                  <img
                    src={att.url}
                    alt={attachmentLabel(att)}
                    className="max-w-[240px] max-h-[200px] object-cover"
                  />
                </a>
              ) : (
                <a
                  key={`${att.url}-${i}`}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-opacity hover:opacity-90"
                  style={{
                    background: "var(--fin-card-2)",
                    border: "1px solid var(--fin-border-2)",
                    color: "var(--fin-text)",
                  }}
                >
                  <FileText className="w-4 h-4 flex-shrink-0" style={{ color: "var(--fin-accent)" }} />
                  <span className="truncate max-w-[180px]">{attachmentLabel(att)}</span>
                </a>
              )
            )}
          </div>
        )}

        {hasText && (
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
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
            ) : (
              <ChatMarkdown content={content} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
