"use client";

import { useState, useTransition } from "react";
import {
  markCareerRead,
  deleteCareerApplication,
  updateCareerStatus,
} from "@/app/karealfaadmin/career-actions";
import { AdminIcon } from "@/components/admin/AdminIcon";

export type CareerItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string | null;
  cvUrl: string | null;
  cvFilename: string | null;
  isRead: boolean;
  status: string;
  notes: string;
  createdAt: string;
};

const STATUS_OPTIONS = [
  { value: "NEW", label: "Yeni", color: "bg-amber-100 text-amber-800" },
  { value: "REVIEWING", label: "İnceleniyor", color: "bg-blue-100 text-blue-800" },
  { value: "INTERVIEW", label: "Mülakat", color: "bg-violet-100 text-violet-800" },
  { value: "HIRED", label: "İşe Alındı", color: "bg-emerald-100 text-emerald-800" },
  { value: "REJECTED", label: "Reddedildi", color: "bg-zinc-200 text-zinc-700" },
];

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

export function CareerList({ items }: { items: CareerItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const handleMarkRead = (id: string) => {
    startTransition(() => {
      void markCareerRead(id);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Bu başvuruyu silmek istediğinize emin misiniz?")) return;
    startTransition(() => {
      void deleteCareerApplication(id);
    });
  };

  const handleStatusChange = (id: string, status: string, currentNotes: string) => {
    startTransition(() => {
      void updateCareerStatus(id, status, currentNotes);
    });
  };

  const handleNotesSave = (id: string, status: string) => {
    const notes = notesDraft[id] ?? "";
    startTransition(() => {
      void updateCareerStatus(id, status, notes);
    });
  };

  return (
    <div className="mt-6 space-y-3">
      {items.map((m) => {
        const isOpen = openId === m.id;
        const statusOpt = STATUS_OPTIONS.find((s) => s.value === m.status) ?? STATUS_OPTIONS[0];
        return (
          <div
            key={m.id}
            className={`admin-card overflow-hidden transition ${
              m.isRead ? "" : "ring-2 ring-secondary/30"
            }`}
          >
            <button
              type="button"
              className="flex w-full items-center gap-4 p-5 text-left"
              onClick={() => {
                setOpenId(isOpen ? null : m.id);
                if (!m.isRead) handleMarkRead(m.id);
              }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                <AdminIcon name="person_add" size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">
                    {m.firstName} {m.lastName}
                    {!m.isRead && (
                      <span className="ml-2 inline-block h-2 w-2 rounded-full bg-red-500" />
                    )}
                  </p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusOpt.color}`}>
                    {statusOpt.label}
                  </span>
                </div>
                <p className="truncate text-xs text-(--on-surface)/60">
                  {m.email} • {m.phone}
                </p>
              </div>
              <div className="hidden text-xs text-(--on-surface)/50 sm:block">
                {formatDate(m.createdAt)}
              </div>
              <AdminIcon
                name={isOpen ? "arrow_back" : "arrow_forward"}
                size={18}
                className={`shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
              />
            </button>

            {isOpen && (
              <div className="border-t border-(--ghost-outline) bg-(--surface)/50 p-5 text-sm">
                {m.message && (
                  <div className="mb-4">
                    <p className="label-sm mb-1 text-(--primary)/55">Mesaj</p>
                    <p className="whitespace-pre-wrap text-(--on-surface)/80">{m.message}</p>
                  </div>
                )}

                {m.cvUrl ? (
                  <div className="mb-4">
                    <p className="label-sm mb-1 text-(--primary)/55">CV</p>
                    <a
                      href={m.cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-secondary/30 bg-white px-3 py-2 text-sm font-semibold text-secondary transition hover:bg-secondary/5"
                    >
                      <AdminIcon name="image" size={16} />
                      {m.cvFilename || "CV'yi Aç"}
                    </a>
                  </div>
                ) : (
                  <p className="mb-4 text-xs text-(--on-surface)/40">CV yüklenmemiş</p>
                )}

                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="label-sm mb-1 text-(--primary)/55">Durum</p>
                    <select
                      value={m.status}
                      disabled={pending}
                      onChange={(e) => handleStatusChange(m.id, e.target.value, notesDraft[m.id] ?? m.notes)}
                      className="w-full rounded-lg border border-(--ghost-outline) bg-white px-3 py-2 text-sm outline-none focus:border-(--secondary)"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <a
                      href={`mailto:${m.email}`}
                      className="rounded-lg border border-(--ghost-outline) bg-white px-3 py-2 text-xs font-semibold text-(--primary)/80 transition hover:bg-(--surface)"
                    >
                      E-posta
                    </a>
                    <a
                      href={`tel:${m.phone}`}
                      className="rounded-lg border border-(--ghost-outline) bg-white px-3 py-2 text-xs font-semibold text-(--primary)/80 transition hover:bg-(--surface)"
                    >
                      Telefon
                    </a>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="label-sm mb-1 text-(--primary)/55">Notlar</p>
                  <textarea
                    rows={3}
                    defaultValue={m.notes}
                    onChange={(e) => setNotesDraft((d) => ({ ...d, [m.id]: e.target.value }))}
                    className="w-full rounded-lg border border-(--ghost-outline) bg-white px-3 py-2 text-sm outline-none focus:border-(--secondary)"
                    placeholder="Bu başvuruyla ilgili dahili notlar..."
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleNotesSave(m.id, m.status)}
                    className="mt-2 rounded-lg bg-(--primary) px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    Notları Kaydet
                  </button>
                </div>

                <div className="flex justify-end gap-2 border-t border-(--ghost-outline) pt-4">
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    disabled={pending}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    Sil
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
