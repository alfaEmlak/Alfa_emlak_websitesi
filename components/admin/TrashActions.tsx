"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runBulkAction } from "@/app/karealfaadmin/bulk-actions";

export type TrashRow = {
  id: string;
  listing_id: string;
  title: string;
  city: string;
  region: string;
  deleted_at: string | null;
  deleted_by_name: string | null;
  status_before_delete: string | null;
};

/**
 * Çöp kutusu listesi: seçim + geri yükleme / kalıcı silme.
 *
 * Kalıcı silme geri alınamadığı için adet onayı istenir; geri yükleme
 * ilanı silinmeden önceki yayın durumuna döndürür (feed bayrakları kapalı kalır).
 */
export function TrashActions({ rows }: { rows: TrashRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmText, setConfirmText] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function run(action: "restore" | "purge") {
    if (selected.size === 0) return;
    if (action === "purge" && confirmText.trim() !== String(selected.size)) return;

    startTransition(async () => {
      const res = await runBulkAction({ target: { mode: "ids", ids: [...selected] }, action });
      if (!res.ok) {
        setMessage({ kind: "err", text: `İşlem başarısız: ${res.error}` });
        return;
      }
      setMessage({
        kind: "ok",
        text:
          action === "restore"
            ? `${res.affected} ilan geri yüklendi. Feed bayrakları kapalı kaldı — gerekiyorsa yeniden açın.`
            : `${res.affected} ilan kalıcı olarak silindi.`,
      });
      setSelected(new Set());
      setConfirmText("");
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-16 text-center">
        <p className="text-lg font-semibold text-zinc-400">Çöp kutusu boş</p>
      </div>
    );
  }

  return (
    <>
      {message ? (
        <div
          className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
            message.kind === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Tümünü seç"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer rounded border-zinc-300 accent-emerald-600"
                />
              </th>
              <th className="px-4 py-3 font-semibold">İlan ID</th>
              <th className="px-4 py-3 font-semibold">Başlık</th>
              <th className="px-4 py-3 font-semibold">Konum</th>
              <th className="px-4 py-3 font-semibold">Silinme</th>
              <th className="px-4 py-3 font-semibold">Silen</th>
              <th className="px-4 py-3 font-semibold">Önceki durum</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={r.title}
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                    className="h-4 w-4 cursor-pointer rounded border-zinc-300 accent-emerald-600"
                  />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">{r.listing_id}</td>
                <td className="px-4 py-3 font-medium text-zinc-800">{r.title}</td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {r.city} / {r.region}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">{formatDate(r.deleted_at)}</td>
                <td className="px-4 py-3 text-xs text-zinc-500">{r.deleted_by_name || "—"}</td>
                <td className="px-4 py-3 text-xs text-zinc-500">{r.status_before_delete || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected.size > 0 ? (
        <div className="sticky bottom-0 z-30 mt-4 rounded-2xl border border-zinc-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-zinc-800">{selected.size} ilan seçildi</span>

            <button
              type="button"
              onClick={() => run("restore")}
              disabled={pending}
              className="min-h-[44px] rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {pending ? "Çalışıyor…" : "Geri yükle"}
            </button>

            <div className="ml-auto flex items-center gap-2">
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                inputMode="numeric"
                placeholder={`Kalıcı silmek için ${selected.size} yazın`}
                className="min-h-[44px] w-56 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/25"
              />
              <button
                type="button"
                onClick={() => run("purge")}
                disabled={pending || confirmText.trim() !== String(selected.size)}
                className="min-h-[44px] rounded-xl bg-rose-600 px-5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-40"
              >
                Kalıcı sil
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Kalıcı silme geri alınamaz; ilanın görselleri de depolamadan kaldırılır.
          </p>
        </div>
      ) : null}
    </>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
