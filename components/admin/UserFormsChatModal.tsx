"use client";

import { useEffect } from "react";

export type ChatLine = { role: string; content: string };

export function UserFormsChatModal({
  open,
  title,
  transcript,
  fallbackSummary,
  onClose,
}: {
  open: boolean;
  title: string;
  transcript: ChatLine[] | null;
  fallbackSummary?: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const lines =
    transcript && transcript.length > 0
      ? transcript
      : fallbackSummary?.trim()
        ? [{ role: "summary", content: fallbackSummary.trim() }]
        : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" aria-label="Kapat" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-forms-chat-title"
        className="relative z-[101] flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-(--ghost-outline) bg-white shadow-[0_24px_80px_rgba(2,10,36,0.18)]"
      >
        <div className="flex items-center justify-between border-b border-(--ghost-outline) px-4 py-3">
          <h2 id="user-forms-chat-title" className="text-base font-bold text-(--primary)">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-(--on-surface)/55 hover:bg-slate-100 hover:text-(--on-surface)"
          >
            Kapat
          </button>
        </div>
        <div className="no-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
          {lines.length === 0 ? (
            <p className="text-sm text-(--on-surface)/50">Bu kayıt için konuşma metni bulunmuyor.</p>
          ) : (
            lines.map((line, i) => {
              const isUser = line.role === "user";
              const isAssistant = line.role === "assistant";
              const isSummary = line.role === "summary";
              return (
                <div
                  key={`${i}-${line.role}`}
                  className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    isSummary
                      ? "self-center border border-amber-200/80 bg-amber-50 text-amber-950"
                      : isUser
                        ? "self-end bg-(--primary) text-white"
                        : isAssistant
                          ? "self-start border border-slate-200 bg-slate-100 text-slate-900"
                          : "self-start border border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                >
                  {!isSummary ? (
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide opacity-70">
                      {isUser ? "Ziyaretçi" : isAssistant ? "Yapay zeka" : line.role}
                    </p>
                  ) : (
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">Kayıtlı özet (tam konuşma yok)</p>
                  )}
                  {line.content}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
