"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  listTransferableListings,
  transferListings,
  type TransferError,
} from "@/app/karealfaadmin/transfer-actions";

type AgentOption = { id: string; name: string; isActive: boolean };

type ListingRow = {
  id: string;
  listing_id: string | null;
  title: string | null;
  publish_status: string | null;
  consultant_name: string | null;
  agent_locked: boolean | null;
};

const ERROR_TEXT: Record<TransferError, string> = {
  same_agent: "Kaynak ve hedef danışman aynı olamaz.",
  agent_not_found: "Danışman bulunamadı.",
  no_listings: "Aktarılacak ilan yok.",
  db_error: "Aktarım sırasında veritabanı hatası oluştu.",
};

const STATUS_TEXT: Record<string, string> = {
  PUBLISHED: "Yayında",
  DRAFT: "Taslak",
  PENDING_APPROVAL: "Onay bekliyor",
  ARCHIVED: "Arşiv",
};

const selectClass =
  "mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20";

export function ListingTransferForm({ agents }: { agents: AgentOption[] }) {
  const router = useRouter();
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const fromAgent = useMemo(() => agents.find((a) => a.id === fromId), [agents, fromId]);
  const toAgent = useMemo(() => agents.find((a) => a.id === toId), [agents, toId]);

  // Kaynak danışman değişince ilan listesini tazele.
  useEffect(() => {
    setMessage(null);
    setChecked(new Set());
    if (!fromId) {
      setRows([]);
      return;
    }
    startLoading(async () => {
      const data = await listTransferableListings(fromId);
      const mapped = (data as ListingRow[]) ?? [];
      setRows(mapped);
      // Varsayılan: tümü seçili — ayrılan danışman senaryosunda beklenen davranış.
      setChecked(new Set(mapped.map((r) => String(r.id))));
    });
  }, [fromId]);

  const allChecked = rows.length > 0 && checked.size === rows.length;

  function toggleAll() {
    setChecked(allChecked ? new Set() : new Set(rows.map((r) => String(r.id))));
  }

  function toggleOne(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    if (saving || !fromAgent || !toAgent || checked.size === 0) return;

    const confirmText =
      `${fromAgent.name} → ${toAgent.name}\n\n` +
      `${checked.size} ilan aktarılacak. İlanların danışman adı, telefonu, ` +
      `WhatsApp'ı, e-postası ve fotoğrafı ${toAgent.name} ile değiştirilecek ve ` +
      `bu değişiklik 101evler / hangiev feed'lerine yansıyacak.\n\nDevam edilsin mi?`;
    if (!window.confirm(confirmText)) return;

    startSaving(async () => {
      const res = await transferListings({
        fromAgentId: fromId,
        toAgentId: toId,
        listingIds: Array.from(checked),
      });
      if (res.ok) {
        setMessage({ kind: "ok", text: `${res.moved} ilan ${toAgent.name} danışmanına aktarıldı.` });
        setRows([]);
        setChecked(new Set());
        setFromId("");
        router.refresh();
      } else {
        setMessage({ kind: "err", text: ERROR_TEXT[res.error] });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Kaynak danışman
          <select value={fromId} onChange={(e) => setFromId(e.target.value)} className={selectClass}>
            <option value="">Seçiniz…</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.isActive ? "" : " (pasif)"}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold">
          Hedef danışman
          <select value={toId} onChange={(e) => setToId(e.target.value)} className={selectClass}>
            <option value="">Seçiniz…</option>
            {agents
              .filter((a) => a.id !== fromId)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.isActive ? "" : " (pasif)"}
                </option>
              ))}
          </select>
        </label>
      </div>

      {message ? (
        <p
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
            message.kind === "ok"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {loading ? <p className="text-sm opacity-70">İlanlar yükleniyor…</p> : null}

      {!loading && fromId && rows.length === 0 ? (
        <p className="text-sm opacity-70">Bu danışmana bağlı ilan bulunamadı.</p>
      ) : null}

      {rows.length > 0 ? (
        <div className="rounded-xl border border-(--ghost-outline)">
          <div className="flex items-center justify-between border-b border-(--ghost-outline) px-3 py-2">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              Tümünü seç
            </label>
            <span className="text-xs opacity-70">
              {checked.size} / {rows.length} seçili
            </span>
          </div>

          <div className="admin-scroll max-h-[26rem] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <tbody>
                {rows.map((r) => {
                  const id = String(r.id);
                  return (
                    <tr key={id} className="border-b border-(--ghost-outline)/60 last:border-0">
                      <td className="w-10 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={checked.has(id)}
                          onChange={() => toggleOne(id)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-medium">{r.title || "(başlıksız)"}</span>
                        <span className="block text-xs opacity-60">{r.listing_id}</span>
                      </td>
                      <td className="px-3 py-2 text-xs opacity-70">
                        {STATUS_TEXT[r.publish_status ?? ""] ?? r.publish_status}
                      </td>
                      <td className="px-3 py-2 text-xs opacity-70">{r.consultant_name ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving || !fromId || !toId || checked.size === 0}
        className="rounded-xl bg-(--secondary) px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Aktarılıyor…" : `Seçili ${checked.size} ilanı aktar`}
      </button>
    </div>
  );
}
