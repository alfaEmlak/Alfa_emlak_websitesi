"use client";

import { useState, useTransition } from "react";
import { markMessageRead, deleteMessage, updateMessageCrmData } from "@/app/karealfaadmin/module-actions";
import { AdminIcon } from "@/components/admin/AdminIcon";

/* ── Status definitions ── */
const STATUS_OPTIONS = [
  { value: "NEW", label: "Yeni", color: "bg-blue-100 text-blue-700", icon: "fiber_new" },
  { value: "CONTACTED", label: "Arandı", color: "bg-amber-100 text-amber-700", icon: "call" },
  { value: "PRESENTED", label: "Sunum Yapıldı", color: "bg-purple-100 text-purple-700", icon: "slideshow" },
  { value: "CLOSED_WON", label: "Satış Kapandı", color: "bg-green-100 text-green-700", icon: "check_circle" },
  { value: "CLOSED_LOST", label: "Kapanmadı", color: "bg-red-100 text-red-700", icon: "cancel" },
] as const;

function getStatusMeta(value: string) {
  return STATUS_OPTIONS.find((s) => s.value === value) ?? STATUS_OPTIONS[0];
}

type Message = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  listingId: string | null;
  isRead: boolean;
  createdAt: string;
  status: string;
  notes: string;
  agentId: string | null;
};

export function MessageList({ messages: initial }: { messages: Message[] }) {
  const [messages, setMessages] = useState(initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

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

  function handleSelect(m: Message) {
    setSelected(m.id);
    setEditNotes(m.notes || "");
    if (!m.isRead) handleRead(m.id);
  }

  function handleStatusChange(id: string, newStatus: string) {
    startTransition(async () => {
      await updateMessageCrmData(id, { status: newStatus });
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
      );
      flash("Durum güncellendi");
    });
  }

  function handleSaveNotes(id: string) {
    startTransition(async () => {
      await updateMessageCrmData(id, { notes: editNotes });
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, notes: editNotes } : m))
      );
      flash("Notlar kaydedildi");
    });
  }

  function flash(msg: string) {
    setSavedFeedback(msg);
    setTimeout(() => setSavedFeedback(null), 2000);
  }

  const active = messages.find((m) => m.id === selected);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      {/* ── List ── */}
      <div className="admin-card divide-y divide-(--ghost-outline) overflow-hidden">
        {messages.map((m) => {
          const st = getStatusMeta(m.status);
          return (
            <button
              key={m.id}
              onClick={() => handleSelect(m)}
              className={`flex w-full flex-col gap-1 px-5 py-4 text-left transition hover:bg-(--surface-container-low)/50 ${
                selected === m.id ? "bg-surface-low" : ""
              } ${!m.isRead ? "border-l-4 border-(--secondary)" : "border-l-4 border-transparent"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-(--primary)">{m.name}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.color}`}>
                  <AdminIcon name={st.icon} size={12} />
                  {st.label}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                {m.subject && (
                  <span className="text-xs font-medium text-(--on-surface)/70">{m.subject}</span>
                )}
                <span className="ml-auto text-[10px] tabular-nums text-(--on-surface)/40">
                  {new Date(m.createdAt).toLocaleDateString("tr-TR")}
                </span>
              </div>
              <span className="line-clamp-1 text-xs text-(--on-surface)/50">{m.message}</span>
            </button>
          );
        })}
      </div>

      {/* ── Detail / CRM Panel ── */}
      {active ? (
        <div className="admin-card flex flex-col gap-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-(--ghost-outline) p-6">
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

          {/* Contact Info */}
          <div className="flex flex-wrap gap-3 border-b border-(--ghost-outline) px-6 py-3 text-xs text-(--on-surface)/60">
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
            <span className="ml-auto text-[10px] tabular-nums text-(--on-surface)/35">
              {new Date(active.createdAt).toLocaleString("tr-TR")}
            </span>
          </div>

          {/* Message Body */}
          <div className="px-6 py-4">
            <div className="whitespace-pre-wrap rounded-xl bg-surface-low p-4 text-sm leading-relaxed text-(--on-surface)/80">
              {active.message}
            </div>
          </div>

          {/* ── CRM Section ── */}
          <div className="mt-auto border-t border-(--ghost-outline) bg-(--surface-container-low)/30 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-(--on-surface)/50">
              <AdminIcon name="support_agent" size={16} />
              Müşteri Yönetimi (CRM)
            </h3>

            {/* Status Select */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-(--on-surface)/60">
                Durum
              </label>
              <select
                value={active.status}
                onChange={(e) => handleStatusChange(active.id, e.target.value)}
                disabled={isPending}
                className="w-full rounded-lg border border-(--ghost-outline) bg-(--surface-container-low) px-3 py-2 text-sm font-medium text-(--on-surface) outline-none transition focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 disabled:opacity-50"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-semibold text-(--on-surface)/60">
                Notlar
              </label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Müşteri hakkında özel notlar yazın..."
                rows={3}
                className="w-full resize-none rounded-lg border border-(--ghost-outline) bg-(--surface-container-low) px-3 py-2 text-sm text-(--on-surface) outline-none transition placeholder:text-(--on-surface)/30 focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSaveNotes(active.id)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-(--primary) px-4 py-2 text-xs font-bold text-(--on-primary) transition hover:opacity-90 disabled:opacity-50"
              >
                <AdminIcon name="save" size={14} />
                {isPending ? "Kaydediliyor..." : "Notları Kaydet"}
              </button>

              {savedFeedback && (
                <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                  <AdminIcon name="check_circle" size={14} />
                  {savedFeedback}
                </span>
              )}
            </div>
          </div>
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
