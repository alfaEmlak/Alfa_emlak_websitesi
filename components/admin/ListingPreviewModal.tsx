"use client";

import { useEffect, useState } from "react";

type Props = {
  href: string;
  title: string;
  children: React.ReactNode;
  className?: string;
};

export function ListingPreviewModal({ href, title, children, className }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setLoading(true);
          setOpen(true);
        }}
        className={className ?? "text-left"}
        title="Canlı önizleme"
      >
        {children}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[600] flex flex-col bg-black/70 p-3 sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
                  Canlı önizleme
                </p>
                <p className="truncate text-sm font-bold text-zinc-800">{title}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  Yeni sekmede aç
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Kapat"
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-zinc-900"
                >
                  Kapat — Esc
                </button>
              </div>
            </div>

            <div className="relative flex-1 bg-zinc-100">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm text-zinc-500">Yükleniyor…</span>
                </div>
              ) : null}
              <iframe
                src={href}
                title={title}
                className="h-full w-full"
                onLoad={() => setLoading(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
