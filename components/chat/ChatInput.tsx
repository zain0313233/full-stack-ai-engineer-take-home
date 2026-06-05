"use client";

import { useRef, useState, KeyboardEvent } from "react";
import { Send, Paperclip, X, FileText } from "lucide-react";

export interface PendingAttachment {
  url: string;
  contentType: string;
  name: string;
  base64?: string;
}

interface Props {
  onSend: (text: string, attachment?: PendingAttachment) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const clearAttachment = () => {
    setAttachment(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const isImage = file.type.startsWith("image/");
      setAttachment({
        url: result,
        contentType: file.type || (isImage ? "image/jpeg" : "application/octet-stream"),
        name: file.name,
        base64: isImage ? result.split(",")[1] : undefined,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && !attachment) return;
    const defaultText = attachment?.contentType.startsWith("image/")
      ? "Please read this receipt."
      : `Shared file: ${attachment?.name ?? "document"}`;
    onSend(trimmed || defaultText, attachment ?? undefined);
    setText("");
    clearAttachment();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div
      className="p-3 rounded-2xl"
      style={{ background: "var(--fin-card)", border: "1px solid var(--fin-border-2)" }}
    >
      {attachment && (
        <div className="relative mb-2 inline-block">
          {attachment.contentType.startsWith("image/") ? (
            <img
              src={attachment.url}
              alt={attachment.name}
              className="h-20 rounded-xl object-cover"
              style={{ border: "1px solid var(--fin-border-2)" }}
            />
          ) : (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
              style={{ background: "var(--fin-card-2)", border: "1px solid var(--fin-border-2)", color: "var(--fin-text)" }}
            >
              <FileText className="w-4 h-4" style={{ color: "var(--fin-accent)" }} />
              <span className="truncate max-w-[200px]">{attachment.name}</span>
            </div>
          )}
          <button
            onClick={clearAttachment}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "var(--fin-red)", color: "#fff" }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Attachment button */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="p-2 rounded-xl flex-shrink-0 transition-colors"
          style={{ color: "var(--fin-muted)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--fin-accent)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--fin-muted)")}
          title="Attach image or document"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt,.csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onInput={handleTextareaInput}
          onKeyDown={handleKeyDown}
          placeholder={attachment ? "Add a note…" : "Ask about your finances…"}
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed disabled:opacity-50"
          style={{ color: "var(--fin-text)", maxHeight: "160px" }}
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !attachment)}
          className="p-2.5 rounded-xl flex-shrink-0 transition-all disabled:opacity-40"
          style={{ background: "var(--fin-accent)", color: "#fff" }}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[11px] mt-1.5 text-center" style={{ color: "var(--fin-text-3)" }}>
        Enter to send · Shift+Enter for new line · 📎 attach images or documents
      </p>
    </div>
  );
}
