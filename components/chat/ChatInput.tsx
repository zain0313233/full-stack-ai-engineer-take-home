"use client";

import { useRef, useState, KeyboardEvent } from "react";
import { Send, Paperclip, X, Image as ImageIcon } from "lucide-react";

interface Props {
  onSend: (text: string, imageBase64?: string, imageMimeType?: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageMimeType(file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      // Strip the data URL prefix for the API
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && !imageBase64) return;
    onSend(trimmed || "Please read this receipt.", imageBase64 ?? undefined, imageMimeType);
    setText("");
    setImagePreview(null);
    setImageBase64(null);
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
      {/* Image preview */}
      {imagePreview && (
        <div className="relative mb-2 inline-block">
          <img
            src={imagePreview}
            alt="Receipt preview"
            className="h-20 rounded-xl object-cover"
            style={{ border: "1px solid var(--fin-border-2)" }}
          />
          <button
            onClick={() => { setImagePreview(null); setImageBase64(null); }}
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
          title="Upload receipt image"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
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
          placeholder={imageBase64 ? "Add a note about this receipt…" : "Ask about your finances…"}
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed disabled:opacity-50"
          style={{ color: "var(--fin-text)", maxHeight: "160px" }}
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !imageBase64)}
          className="p-2.5 rounded-xl flex-shrink-0 transition-all disabled:opacity-40"
          style={{ background: "var(--fin-accent)", color: "#fff" }}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[11px] mt-1.5 text-center" style={{ color: "var(--fin-text-3)" }}>
        Enter to send · Shift+Enter for new line · 📎 attach receipt photos
      </p>
    </div>
  );
}
