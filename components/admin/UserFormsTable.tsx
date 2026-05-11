"use client";

import Link from "next/link";
import { useState } from "react";
import { UserFormsChatModal, type ChatLine } from "@/components/admin/UserFormsChatModal";

export type UserFormRow = {
  key: string;
  source: "ai" | "contact";
  id: string;
  createdAt: string;
  name: string;
  phone: string | null;
  email: string | null;
  summary: string;
  listingIdsText: string;
  isNew: boolean;
  transcript: ChatLine[] | null;
  detailHref: string | null;
};

export function UserFormsTable({ rows }: { rows: UserFormRow[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const active = openKey ? rows.find((r) => r.key === openKey) : null;

  return (
    <>
      <div className="admin-card mt-8 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-(--ghost-outline) text-(--on-surface)/55">
            <tr>
              <th className="px-4 py-3">Tarih</th>
              <th className="px-4 py-3">Ad Soyad</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3">E-posta</th>
              <th className="px-4 py-3">İstenen İlan/Kriter Özeti</th>
              <th className="px-4 py-3">Önerilen İlanlar</th>
              <th className="px-4 py-3 w-[1%]">Konuşma</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr
                key={item.key}
                className={`border-b border-(--ghost-outline)/70 align-top ${
                  item.isNew ? "bg-emerald-50/90 ring-1 ring-emerald-200/80" : ""
                }`}
              >
                <td className="px-4 py-3 whitespace-nowrap text-xs text-(--on-surface)/50">
                  <span className="inline-flex flex-col gap-1">
                    <span>{new Date(item.createdAt).toLocaleString("tr-TR")}</span>
                    {item.isNew ? (
                      <span className="inline-flex w-fit rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        Yeni
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-(--primary)">
                  {item.detailHref ? (
                    <Link href={item.detailHref} className="hover:underline">
                      {item.name || "-"}
                    </Link>
                  ) : (
                    item.name || "-"
                  )}
                </td>
                <td className="px-4 py-3">{item.phone || "-"}</td>
                <td className="px-4 py-3">{item.email || "-"}</td>
                <td className="min-w-[320px] px-4 py-3 whitespace-pre-wrap text-xs text-(--on-surface)/75">{item.summary || "-"}</td>
                <td className="px-4 py-3 text-xs text-(--on-surface)/70">{item.listingIdsText || "-"}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setOpenKey(item.key)}
                    className="rounded-lg border border-(--primary)/25 bg-white px-3 py-1.5 text-xs font-semibold text-(--primary) shadow-sm transition hover:bg-(--primary)/5"
                  >
                    Sohbeti gör
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UserFormsChatModal
        open={!!active}
        title={active ? `${active.name} — sohbet` : ""}
        transcript={active?.transcript ?? null}
        fallbackSummary={active?.summary ?? null}
        onClose={() => setOpenKey(null)}
      />
    </>
  );
}
