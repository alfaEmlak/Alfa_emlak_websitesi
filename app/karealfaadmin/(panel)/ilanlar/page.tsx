import Image from "next/image";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined) {
  if (Array.isArray(v)) return v[0];
  return v;
}

function getCoverImage(listing: any): string {
  if (listing.cover_image && typeof listing.cover_image === "string" && listing.cover_image.trim()) return listing.cover_image.trim();
  if (listing.coverImage && typeof listing.coverImage === "string" && listing.coverImage.trim()) return listing.coverImage.trim();
  const images = listing.listing_images ?? listing.images ?? [];
  if (!Array.isArray(images) || images.length === 0) return "/placeholder-property.svg";
  const sorted = [...images].sort((a: any, b: any) => (a.sort_order ?? a.sortOrder ?? 0) - (b.sort_order ?? b.sortOrder ?? 0));
  const primary = sorted.find((i: any) => i.is_primary ?? i.isPrimary) ?? sorted[0];
  return primary?.url ?? "/placeholder-property.svg";
}

function formatMoney(price: number, currency: string) {
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currency === "TRY" ? "TRY" : currency === "GBP" ? "GBP" : "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${price.toLocaleString("tr-TR")} ${currency}`;
  }
}

export default async function AdminListingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const qId = first(sp.listingId)?.trim();
  const qTitle = first(sp.title)?.trim();
  const city = first(sp.city)?.trim();
  const kind = first(sp.kind)?.trim();
  const status = first(sp.status)?.trim();

  let query = supabaseAdmin
    .from("listings")
    .select("*, listing_images(*)");

  if (qId) query = query.ilike("listing_id", `%${qId}%`);
  if (qTitle) query = query.ilike("title", `%${qTitle}%`);
  if (city) query = query.ilike("city", `%${city}%`);
  if (kind && ["SATILIK", "KIRALIK", "GUNLUK_KIRALIK", "PROJE"].includes(kind)) query = query.eq("kind", kind);
  if (status && ["DRAFT", "PUBLISHED", "HIDDEN"].includes(status)) query = query.eq("publish_status", status);

  const { data: rows } = await query
    .order("updated_at", { ascending: false })
    .limit(80);

  const listings = rows || [];

  const kindLabels: Record<string, string> = {
    SATILIK: "Satılık",
    KIRALIK: "Kiralık",
    GUNLUK_KIRALIK: "Günlük",
    PROJE: "Proje",
  };

  const statusLabels: Record<string, string> = {
    DRAFT: "Taslak",
    PUBLISHED: "Yayında",
    HIDDEN: "Gizli",
  };

  return (
    <div className="p-6 lg:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">İlanlarınız</h1>
          <p className="text-sm text-zinc-500">Listeyi filtreleyin; düzenlemek için satırdaki bağlantıyı kullanın.</p>
        </div>
        <Link
          href="/karealfaadmin/ilanlar/yeni"
          className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700"
        >
          Yeni ilan
        </Link>
      </div>

      <form className="mt-6 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
        <input
          name="listingId"
          placeholder="İlan ID"
          defaultValue={qId ?? ""}
          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
        />
        <input
          name="title"
          placeholder="Başlık"
          defaultValue={qTitle ?? ""}
          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
        />
        <input
          name="city"
          placeholder="Şehir"
          defaultValue={city ?? ""}
          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
        />
        <select
          name="kind"
          defaultValue={kind ?? ""}
          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
        >
          <option value="">Tür (tümü)</option>
          <option value="SATILIK">Satılık</option>
          <option value="KIRALIK">Kiralık</option>
          <option value="GUNLUK_KIRALIK">Günlük</option>
          <option value="PROJE">Proje</option>
        </select>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
        >
          <option value="">Durum (tümü)</option>
          <option value="PUBLISHED">Yayında</option>
          <option value="DRAFT">Taslak</option>
          <option value="HIDDEN">Gizli</option>
        </select>
        <button
          type="submit"
          className="rounded-xl bg-zinc-800 py-2 text-sm font-bold text-white transition hover:bg-zinc-900"
        >
          Filtrele
        </button>
      </form>

      <div className="mt-6 overflow-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-3">Kapak</th>
              <th className="px-3 py-3">İlan ID</th>
              <th className="px-3 py-3">Başlık</th>
              <th className="px-3 py-3">Tür</th>
              <th className="px-3 py-3">Şehir / Bölge</th>
              <th className="px-3 py-3">Fiyat</th>
              <th className="px-3 py-3">Durum</th>
              <th className="px-3 py-3">Güncelleme</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {listings.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm text-zinc-400">
                  Henüz ilan yok
                </td>
              </tr>
            ) : (
              listings.map((r) => {
                const img = getCoverImage(r);
                const isRemote = img.startsWith("http");
                return (
                  <tr key={r.id} className="transition hover:bg-zinc-50">
                    <td className="px-3 py-2">
                      <div className="relative h-12 w-16 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200">
                        <Image src={img} alt="" fill className="object-cover" sizes="64px" unoptimized={isRemote} />
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-500">{r.listing_id}</td>
                    <td className="max-w-50 truncate px-3 py-2 font-medium text-zinc-800">{r.title}</td>
                    <td className="px-3 py-2 text-zinc-600">{kindLabels[r.kind] ?? r.kind}</td>
                    <td className="px-3 py-2 text-xs text-zinc-500">
                      {r.city} / {r.region}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{formatMoney(r.price, r.currency)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.publish_status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" :
                        r.publish_status === "HIDDEN" ? "bg-red-100 text-red-700" :
                        "bg-zinc-100 text-zinc-600"
                      }`}>
                        {statusLabels[r.publish_status] ?? r.publish_status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-400">{new Date(r.updated_at).toLocaleDateString("tr-TR")}</td>
                    <td className="px-3 py-2 text-right">
                      <Link href={`/karealfaadmin/ilanlar/${r.id}/duzenle`} className="font-semibold text-emerald-600 hover:underline">
                        Düzenle
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
