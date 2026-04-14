"use client";

import { useState } from "react";
import { markMessageRead, deleteMessage } from "@/app/karealfaadmin/module-actions";
import { AdminIcon } from "@/components/admin/AdminIcon";

type Message = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  listingId: string | null;
  isRead: boolean;
  createdAt: Date;
};

export function MessageList({ messages: initial }: { messages: Message[] }) {
  const [messages, setMessages] = useState(initial);
  const [selected, setSelected] = useState<string | null>(null);

  async function handleRead(id: string) {
    await markMessageRead(id);
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isRead: true } : m)));
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu mesajı silmek istediğinize emin misiniz?")) return;
    await deleteMessage(id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selected === id) setSelected(null);
  }

  const active = messages.find((m) => m.id === selected);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      {/* List */}
      <div className="admin-card divide-y divide-(--ghost-outline) overflow-hidden">
        {messages.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              setSelected(m.id);
              if (!m.isRead) handleRead(m.id);
            }}
            className={`flex w-full flex-col gap-1 px-5 py-4 text-left transition hover:bg-(--surface-container-low)/50 ${
              selected === m.id ? "bg-surface-low" : ""
            } ${!m.isRead ? "border-l-4 border-(--secondary)" : "border-l-4 border-transparent"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-(--primary)">{m.name}</span>
              <span className="text-[10px] tabular-nums text-(--on-surface)/40">
                {new Date(m.createdAt).toLocaleDateString("tr-TR")}
              </span>
            </div>
            {m.subject && (
              <span className="text-xs font-medium text-(--on-surface)/70">{m.subject}</span>
            )}
            <span className="line-clamp-1 text-xs text-(--on-surface)/50">{m.message}</span>
          </button>
        ))}
      </div>

      {/* Detail */}
      {active ? (
        <div className="admin-card p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-(--primary)">{active.name}</h2>
              {active.subject && (
                <p className="mt-1 text-sm font-medium text-(--on-surface)/70">{active.subject}</p>
              )}
            </div>
            <button
              onClick={() => handleDelete(active.id)}
              className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
            >
              Sil
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-(--on-surface)/60">
            {active.email && (
              <span className="flex items-center gap-1">
                <AdminIcon name="mail" size={14} />{active.email}
              </span>
            )}
            {active.phone && (
              <span className="flex items-center gap-1">
                <AdminIcon name="call" size={14} />{active.phone}
              </span>
            )}
            {active.listingId && (
              <span className="flex items-center gap-1">
                <AdminIcon name="apartment" size={14} />İlan: {active.listingId}
              </span>
            )}
          </div>
          <div className="mt-6 whitespace-pre-wrap rounded-xl bg-surface-low p-4 text-sm leading-relaxed text-(--on-surface)/80">
            {active.message}
          </div>
          <p className="mt-4 text-[10px] tabular-nums text-(--on-surface)/35">
            {new Date(active.createdAt).toLocaleString("tr-TR")}
          </p>
        </div>
      ) : (
        <div className="admin-card flex flex-col items-center justify-center p-16 text-center">
          <AdminIcon name="touch_app" size={36} className="text-(--on-surface)/15" />
          <p className="mt-3 text-sm text-(--on-surface)/35">Bir mesaj seçin</p>
        </div>
      )}
    </div>
  );
}
