"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="chat-markdown text-sm leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
