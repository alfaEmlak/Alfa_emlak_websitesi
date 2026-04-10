"use client";

import { useState, useTransition } from "react";

export function MenuEditor({
  initial,
  saveAction,
}: {
  initial: string;
  saveAction: (json: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [text, setText] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="mt-6 max-w-4xl space-y-4">
      <textarea
        className="admin-card min-h-[480px] w-full p-4 font-mono text-xs outline-none focus:ring-2 focus:ring-[var(--secondary)]/25"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {msg ? <p className="text-sm text-[var(--on-surface)]/65">{msg}</p> : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const r = await saveAction(text);
            setMsg(r.ok ? "Menü güncellendi." : r.message ?? "Hata");
          });
        }}
        className="btn-tactile rounded-xl bg-[var(--secondary)] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-[var(--secondary)]/25 transition hover:bg-[var(--brand-hover)] disabled:opacity-50"
      >
        Kaydet
      </button>
    </div>
  );
}
