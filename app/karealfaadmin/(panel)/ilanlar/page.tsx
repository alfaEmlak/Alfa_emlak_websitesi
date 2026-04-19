import Image from "next/image";
import Link from "next/link";
import { requirePanelUser } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type SearchParams = Record<string, string | string[] | undefined>;
type ListingImageRow = { url: string; sort_order?: number | null; is_primary?: boolean | null };
type ListingRow = {
  id: string;
  listing_id: string;
  title: string;
  city: string;
  region: string;
  price: number;
  currency: string;
  publish_status: string;
  created_by_name?: string | null;
  cover_image?: string | null;
  listing_images?: ListingImageRow[] | null;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getCoverImage(listing: ListingRow): string {
  if (listing.cover_image && typeof listing.cover_image === "string" && listing.cover_image.trim()) return listing.cover_image.trim();
  const images = listing.listing_images ?? [];
  if (!Array.isArray(images) || images.length === 0) return "/placeholder-property.svg";
  const sorted = [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const primary = sorted.find((item) => item.is_primary) ?? sorted[0];
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
  const user = await requirePanelUser();
  const sp = await searchParams;
  const qId = first(sp.listingId)?.trim();
  const qTitle = first(sp.title)?.trim();
  const city = first(sp.city)?.trim();
  const kind = first(sp.kind)?.trim();
  const status = first(sp.status)?.trim();

  let query = supabaseAdmin.from("listings").select("*, listing_images(*)");

  if (qId) query = query.ilike("listing_id", `%${qId}%`);
  if (qTitle) query = query.ilike("title", `%${qTitle}%`);
  if (city) query = query.ilike("city", `%${city}%`);
  if (kind && ["SATILIK", "KIRALIK", "GUNLUK_KIRALIK", "PROJE"].includes(kind)) query = query.eq("kind", kind);
  if (status && ["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "HIDDEN", "REJECTED"].includes(status)) query = query.eq("publish_status", status);

  let result = await query.order("updated_at", { ascending: false }).limit(80);
  if (result.error?.message.includes("Could not find the")) {
    let fallbackQuery = supabaseAdmin.from("listings").select("*, listing_images(*)");
    if (qId) fallbackQuery = fallbackQuery.ilike("listing_id", `%${qId}%`);
    if (qTitle) fallbackQuery = fallbackQuery.ilike("title", `%${qTitle}%`);
    if (city) fallbackQuery = fallbackQuery.ilike("city", `%${city}%`);
    if (kind && ["SATILIK", "KIRALIK", "GUNLUK_KIRALIK", "PROJE"].includes(kind)) fallbackQuery = fallbackQuery.eq("kind", kind);
    if (status && ["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "HIDDEN", "REJECTED"].includes(status)) fallbackQuery = fallbackQuery.eq("publish_status", status);
    result = await fallbackQuery.order("updated_at", { ascending: false }).limit(80);
  }

  const listings = (result.data ?? []) as ListingRow[];

  const statusLabels: Record<string, string> = {
    DRAFT: "Taslak",
    PENDING_APPROVAL: "Onay Bekliyor",
    PUBLISHED: "Yayında",
    HIDDEN: "Gizli",
    REJECTED: "Reddedildi",
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{user.role === "ADMIN" ? "İlan yönetimi" : "İlanlarım"}</h1>
          <p className="text-sm text-zinc-500">
            {user.role === "ADMIN"
              ? "Tüm ilanları, onay bekleyenleri ve yayın akışını yönetin."
              : "Taslaklarınızı hazırlayın ve yayın için admin onayına gönderin."}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/karealfaadmin/onay-bekleyen" className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50">
            {user.role === "ADMIN" ? "Onay Bekleyenler" : "Gönderdiklerim"}
          </Link>
          <Link href="/karealfaadmin/ilanlar/yeni" className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700">
            Yeni ilan
          </Link>
        </div>
      </div>

      <form className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
        <input name="listingId" placeholder="İlan ID" defaultValue={qId ?? ""} className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25" />
        <input name="title" placeholder="Başlık" defaultValue={qTitle ?? ""} className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25" />
        <input name="city" placeholder="Şehir" defaultValue={city ?? ""} className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25" />
        <select name="kind" defaultValue={kind ?? ""} className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25">
          <option value="">Tür (tümü)</option>
          <option value="SATILIK">Satılık</option>
          <option value="KIRALIK">Kiralık</option>
          <option value="GUNLUK_KIRALIK">Günlük</option>
          <option value="PROJE">Proje</option>
        </select>
        <select name="status" defaultValue={status ?? ""} className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25">
          <option value="">Durum (tümü)</option>
          <option value="DRAFT">Taslak</option>
          <option value="PENDING_APPROVAL">Onay Bekliyor</option>
          <option value="PUBLISHED">Yayında</option>
          <option value="HIDDEN">Gizli</option>
          <option value="REJECTED">Reddedildi</option>
        </select>
        <button type="submit" className="min-h-[44px] rounded-xl bg-zinc-800 py-2 text-sm font-bold text-white transition hover:bg-zinc-900">
          Filtrele
        </button>
      </form>

      <div className="mt-6 hidden overflow-auto rounded-2xl border border-zinc-200 bg-white lg:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-3">Kapak</th>
              <th className="px-3 py-3">İlan ID</th>
              <th className="px-3 py-3">Başlık</th>
              <th className="px-3 py-3">Şehir / Bölge</th>
              {user.role === "ADMIN" ? <th className="px-3 py-3">Gönderen</th> : null}
              <th className="px-3 py-3">Fiyat</th>
              <th className="px-3 py-3">Durum</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {listings.length === 0 ? (
              <tr>
                <td colSpan={user.role === "ADMIN" ? 8 : 7} className="px-3 py-8 text-center text-sm text-zinc-400">
                  Henüz ilan yok
                </td>
              </tr>
            ) : (
              listings.map((listing) => {
                const img = getCoverImage(listing);
                const isRemote = img.startsWith("http");
                return (
                  <tr key={listing.id} className="transition hover:bg-zinc-50">
                    <td className="px-3 py-2">
                      <div className="relative h-12 w-16 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200">
                        <Image src={img} alt="" fill className="object-cover" sizes="64px" unoptimized={isRemote} />
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-500">{listing.listing_id}</td>
                    <td className="px-3 py-2 font-medium text-zinc-800">{listing.title}</td>
                    <td className="px-3 py-2 text-xs text-zinc-500">{listing.city} / {listing.region}</td>
                    {user.role === "ADMIN" ? <td className="px-3 py-2 text-xs text-zinc-500">{listing.created_by_name || "Admin"}</td> : null}
                    <td className="px-3 py-2 tabular-nums">{formatMoney(Number(listing.price ?? 0), listing.currency)}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                        {statusLabels[listing.publish_status] ?? listing.publish_status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link href={`/karealfaadmin/ilanlar/${listing.id}/duzenle`} className="font-semibold text-emerald-600 hover:underline">
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
