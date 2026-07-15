import Link from "next/link";
import { requireAdmin } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  buildFeedXml as build101evlerFeed,
  type RealtorIds,
  type RealtorMap,
  type FeedSkipReason as Skip101,
} from "@/lib/feeds/101evler-builder";
import {
  buildFeedXml as buildHangievFeed,
  type HangievAccount,
  type FeedSkipReason as SkipHE,
} from "@/lib/feeds/hangiev-builder";

export const dynamic = "force-dynamic";

const REASON_LABEL_101: Record<Skip101, string> = {
  missing_type_id: "101evler emlak tipi (type_id) eşleştirilmemiş",
  missing_area_id: "101evler bölge kodu (area_id) eşleştirilmemiş",
  missing_sale_or_rent: "Satılık/Kiralık bilgisi yok",
  unsupported_currency: "Desteklenmeyen para birimi",
  missing_price: "Fiyat tanımlı değil veya 0",
};

const REASON_LABEL_HE: Record<SkipHE, string> = {
  missing_sale_or_rent: "Satılık/Kiralık bilgisi yok",
  unsupported_currency: "Desteklenmeyen para birimi",
  missing_price: "Fiyat tanımlı değil veya 0",
};

type ListingMeta = {
  listing_id: string;
  title: string | null;
};

async function fetchListings(column: "export_to_101evler" | "export_to_hangiev") {
  const { data } = await supabaseAdmin
    .from("listings")
    .select("*, listing_images(url, sort_order, is_primary)")
    .eq("publish_status", "PUBLISHED")
    .eq(column, true)
    .order("updated_at", { ascending: false });
  return data ?? [];
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://example.com";
}

export default async function FeedDurumPage() {
  await requireAdmin();

  const { data: settingsRow } = await supabaseAdmin
    .from("site_settings")
    .select("ext_101evler, ext_hangiev")
    .eq("id", 1)
    .single();

  let realtors: RealtorIds = {};
  if (settingsRow?.ext_101evler) {
    const raw = settingsRow.ext_101evler;
    let parsed: { first_realtor_id?: number | string | null; second_realtor_id?: number | string | null } =
      typeof raw === "string" ? safeJson(raw) : (raw as Record<string, unknown>);
    realtors = {
      first_realtor_id: parsed?.first_realtor_id ?? null,
      second_realtor_id: parsed?.second_realtor_id ?? null,
    };
  }

  let hangievAccount: HangievAccount = {};
  if (settingsRow?.ext_hangiev) {
    const raw = settingsRow.ext_hangiev;
    let parsed: { portal_id?: number | string | null; agent_id?: number | string | null; office_id?: number | string | null } =
      typeof raw === "string" ? safeJson(raw) : (raw as Record<string, unknown>);
    hangievAccount = {
      portal_id: parsed?.portal_id ?? null,
      agent_id: parsed?.agent_id ?? null,
      office_id: parsed?.office_id ?? null,
    };
  }

  const { data: agentRows } = await supabaseAdmin
    .from("agents")
    .select("email, realtor_id_101")
    .not("realtor_id_101", "is", null);

  const realtorMap: RealtorMap = {};
  for (const a of agentRows ?? []) {
    if (a.email && a.realtor_id_101 != null) {
      realtorMap[a.email.trim().toLowerCase()] = a.realtor_id_101;
    }
  }

  const [list101, listHE] = await Promise.all([
    fetchListings("export_to_101evler"),
    fetchListings("export_to_hangiev"),
  ]);

  const titleMap = new Map<string, string | null>();
  for (const r of [...list101, ...listHE]) {
    const id = String((r as Record<string, unknown>).listing_id ?? "");
    if (id) titleMap.set(id, ((r as Record<string, unknown>).title as string | null) ?? null);
  }

  const sum101 = build101evlerFeed(list101, realtors, { siteUrl: siteUrl(), defaultLocale: "tr" }, realtorMap);
  const sumHE = buildHangievFeed(listHE, hangievAccount, { siteUrl: siteUrl(), defaultLocale: "tr" });

  return (
    <div className="p-6 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-900">Feed Durumu</h1>
          <p className="mt-1 text-sm text-zinc-500">
            101evler ve hangiev XML feed&apos;lerine hangi ilanların gittiğini, hangilerinin neden atlandığını gösterir.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <FeedCard
          title="101evler"
          total={sum101.total}
          included={sum101.included}
          skipped={sum101.skipped.map((s) => ({
            listingId: s.listingId,
            title: titleMap.get(s.listingId) || null,
            reason: REASON_LABEL_101[s.reason] ?? s.reason,
          }))}
          column="export_to_101evler"
        />
        <FeedCard
          title="hangiev"
          total={sumHE.total}
          included={sumHE.included}
          skipped={sumHE.skipped.map((s) => ({
            listingId: s.listingId,
            title: titleMap.get(s.listingId) || null,
            reason: REASON_LABEL_HE[s.reason] ?? s.reason,
          }))}
          column="export_to_hangiev"
        />
      </div>

      <div className="mt-10 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600">
        <p className="font-semibold text-zinc-800">İlanların feed&apos;e girmesi için gereken koşullar</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Yayın durumu &quot;Yayında&quot; (PUBLISHED) olmalı.</li>
          <li>İlanın editöründe ilgili platforma gönderim seçeneği (101evler / hangiev) açık olmalı.</li>
          <li>Satılık veya Kiralık türü, geçerli fiyat ve para birimi (TRY/USD/EUR/GBP) tanımlı olmalı.</li>
          <li>101evler için ayrıca <span className="font-semibold">emlak tipi</span> ve <span className="font-semibold">bölge</span> 101evler lookup&apos;larından eşleştirilmiş olmalı.</li>
        </ul>
      </div>
    </div>
  );
}

function FeedCard({
  title,
  total,
  included,
  skipped,
}: {
  title: string;
  total: number;
  included: number;
  skipped: { listingId: string; title: string | null; reason: string }[];
  column: string;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-zinc-900">{title}</h2>
        <div className="flex gap-2">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            Gönderilen: {included}
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
            Atlanan: {skipped.length}
          </span>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
            Toplam: {total}
          </span>
        </div>
      </div>

      {skipped.length === 0 ? (
        <p className="mt-6 rounded-xl bg-emerald-50 px-4 py-6 text-center text-sm font-semibold text-emerald-700">
          Tüm ilanlar başarıyla feed&apos;e dahil edildi.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="px-4 py-2.5">İlan</th>
                <th className="px-4 py-2.5">Sebep</th>
                <th className="px-4 py-2.5 text-right">Düzenle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {skipped.map((s) => (
                <tr key={s.listingId}>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-zinc-500">{s.listingId}</div>
                    <div className="font-semibold text-zinc-800 line-clamp-1">{s.title || "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-amber-700">{s.reason}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/karealfaadmin/ilanlar/${encodeURIComponent(s.listingId)}/duzenle`}
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-700"
                    >
                      Aç
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function safeJson<T = Record<string, unknown>>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return {} as T;
  }
}
