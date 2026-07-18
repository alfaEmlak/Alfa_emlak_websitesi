import Link from "next/link";
import { requireAdmin } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  buildAdElement,
  type RealtorIds,
  type RealtorMap,
  type FeedSkipReason as Skip101,
} from "@/lib/feeds/101evler-builder";
import {
  buildListingElement as buildHangievAd,
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

type IncludedItem = {
  listingId: string;
  title: string | null;
  price: string | null;
  currency: string | null;
  kind: string | null;
  consultantName: string | null;
};

type SkippedItem = {
  listingId: string;
  title: string | null;
  reason: string;
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

function kindLabel(kind: string | null): string {
  if (!kind) return "—";
  const map: Record<string, string> = {
    SATILIK: "Satılık",
    KIRALIK: "Kiralık",
    GUNLUK_KIRALIK: "Günlük Kiralık",
    PROJE: "Proje",
  };
  return map[kind] ?? kind;
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
    const parsed: { first_realtor_id?: number | string | null; second_realtor_id?: number | string | null } =
      typeof raw === "string" ? safeJson(raw) : (raw as Record<string, unknown>);
    realtors = {
      first_realtor_id: parsed?.first_realtor_id ?? null,
      second_realtor_id: parsed?.second_realtor_id ?? null,
    };
  }

  let hangievAccount: HangievAccount = {};
  if (settingsRow?.ext_hangiev) {
    const raw = settingsRow.ext_hangiev;
    const parsed: { portal_id?: number | string | null; agent_id?: number | string | null; office_id?: number | string | null } =
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

  const opts = { siteUrl: siteUrl(), defaultLocale: "tr" };

  const included101: IncludedItem[] = [];
  const skipped101: SkippedItem[] = [];
  for (const row of list101) {
    const r = row as Record<string, unknown>;
    const id = String(r.listing_id ?? "");
    const result = buildAdElement(row, realtors, opts, realtorMap);
    if (result.ok) {
      included101.push({
        listingId: id,
        title: (r.title as string | null) ?? null,
        price: r.price != null ? String(r.price) : null,
        currency: (r.currency as string | null) ?? null,
        kind: (r.kind as string | null) ?? null,
        consultantName: (r.consultant_name as string | null) ?? null,
      });
    } else {
      skipped101.push({
        listingId: id,
        title: (r.title as string | null) ?? null,
        reason: REASON_LABEL_101[result.reason] ?? result.reason,
      });
    }
  }

  const includedHE: IncludedItem[] = [];
  const skippedHE: SkippedItem[] = [];
  for (const row of listHE) {
    const r = row as Record<string, unknown>;
    const id = String(r.listing_id ?? "");
    const result = buildHangievAd(row, hangievAccount, opts);
    if (result.ok) {
      includedHE.push({
        listingId: id,
        title: (r.title as string | null) ?? null,
        price: r.price != null ? String(r.price) : null,
        currency: (r.currency as string | null) ?? null,
        kind: (r.kind as string | null) ?? null,
        consultantName: (r.consultant_name as string | null) ?? null,
      });
    } else {
      skippedHE.push({
        listingId: id,
        title: (r.title as string | null) ?? null,
        reason: REASON_LABEL_HE[result.reason] ?? result.reason,
      });
    }
  }

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

      <div className="mt-8 space-y-8">
        <FeedCard
          title="101evler"
          included={included101}
          skipped={skipped101}
        />
        <FeedCard
          title="hangiev"
          included={includedHE}
          skipped={skippedHE}
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
  included,
  skipped,
}: {
  title: string;
  included: IncludedItem[];
  skipped: SkippedItem[];
}) {
  const total = included.length + skipped.length;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-zinc-900">{title}</h2>
        <div className="flex gap-2">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            Gönderilen: {included.length}
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
            Atlanan: {skipped.length}
          </span>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
            Toplam: {total}
          </span>
        </div>
      </div>

      {/* Gönderilen ilanlar */}
      {included.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-bold text-emerald-700">Gönderilen ilanlar</h3>
          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <tr>
                  <th className="px-4 py-2.5">İlan No</th>
                  <th className="px-4 py-2.5">Başlık</th>
                  <th className="px-4 py-2.5">Tür</th>
                  <th className="px-4 py-2.5">Fiyat</th>
                  <th className="px-4 py-2.5">Danışman</th>
                  <th className="px-4 py-2.5 text-right">Düzenle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {included.map((item) => (
                  <tr key={item.listingId} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{item.listingId}</td>
                    <td className="max-w-[250px] px-4 py-3 font-semibold text-zinc-800 line-clamp-1">{item.title || "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">{kindLabel(item.kind)}</td>
                    <td className="px-4 py-3 text-zinc-700">
                      {item.price ? `${Number(item.price).toLocaleString("tr-TR")} ${item.currency ?? ""}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{item.consultantName || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/karealfaadmin/ilanlar/${encodeURIComponent(item.listingId)}/duzenle`}
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
        </div>
      )}

      {/* Atlanan ilanlar */}
      {skipped.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-bold text-amber-700">Atlanan ilanlar</h3>
          <div className="overflow-hidden rounded-xl border border-zinc-200">
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
                  <tr key={s.listingId} className="hover:bg-zinc-50">
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
        </div>
      )}

      {included.length === 0 && skipped.length === 0 && (
        <p className="mt-6 rounded-xl bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
          Bu feed için henüz ilan işaretlenmemiş.
        </p>
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
