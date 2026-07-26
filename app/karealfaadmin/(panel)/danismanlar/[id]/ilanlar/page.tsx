import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { displayListingCity } from "@/lib/listing-city";
import { getPanelLocale } from "@/lib/panel-locale";
import { getPanelTranslations } from "@/lib/panel-translations";
import { requireAdmin } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ListingPreviewModal } from "@/components/admin/ListingPreviewModal";

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
  cover_image?: string | null;
  listing_images?: ListingImageRow[] | null;
};

function getCoverImage(listing: ListingRow): string {
  if (listing.cover_image && typeof listing.cover_image === "string" && listing.cover_image.trim()) return listing.cover_image.trim();
  const images = listing.listing_images ?? [];
  if (!Array.isArray(images) || images.length === 0) return "/placeholder-property.svg";
  const sorted = [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const primary = sorted.find((item) => item.is_primary) ?? sorted[0];
  return primary?.url ?? "/placeholder-property.svg";
}

function formatMoney(price: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency === "TRY" ? "TRY" : currency === "GBP" ? "GBP" : "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${price.toLocaleString(locale)} ${currency}`;
  }
}

export default async function AgentListingsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const t = await getPanelTranslations();
  const locale = await getPanelLocale();

  const { data: agent } = await supabaseAdmin.from("agents").select("*").eq("id", id).single();
  if (!agent) notFound();

  // Feed ilanları danışmana created_by_name ile bağlı; hem agent_id hem isimle eşleştir.
  const agentNameEsc = String(agent.name ?? "").replace(/"/g, '\\"');
  const { data } = await supabaseAdmin
    .from("listings")
    .select("*, listing_images(*)")
    .is("deleted_at", null)
    .or(`created_by_agent_id.eq.${id},created_by_name.eq."${agentNameEsc}"`)
    .order("updated_at", { ascending: false })
    .limit(200);

  const listings = (data ?? []) as ListingRow[];

  function publishLabel(code: string) {
    switch (code) {
      case "DRAFT":
        return t("publishStatus.DRAFT");
      case "PENDING_APPROVAL":
        return t("publishStatus.PENDING_APPROVAL");
      case "PUBLISHED":
        return t("publishStatus.PUBLISHED");
      case "HIDDEN":
        return t("publishStatus.HIDDEN");
      case "REJECTED":
        return t("publishStatus.REJECTED");
      default:
        return code;
    }
  }

  function statusClass(code: string) {
    if (code === "PUBLISHED") return "bg-emerald-50 text-emerald-700";
    if (code === "PENDING_APPROVAL") return "bg-amber-50 text-amber-700";
    if (code === "REJECTED") return "bg-rose-50 text-rose-700";
    if (code === "HIDDEN") return "bg-zinc-100 text-zinc-600";
    return "bg-zinc-100 text-zinc-600";
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <Link
        href="/karealfaadmin/danismanlar"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800"
      >
        <AdminIcon name="arrow_back" size={16} />
        Danışmanlar
      </Link>

      <div className="mt-4 flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-zinc-200 bg-zinc-100">
          {agent.photo ? (
            <Image src={agent.photo} alt={agent.name} fill className="object-cover" sizes="64px" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-400">
              <AdminIcon name="person" size={32} />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold sm:text-3xl">{agent.name}</h1>
          <p className="text-sm text-zinc-500">
            {agent.title || "Emlak Danışmanı"} · {listings.length} ilan
          </p>
        </div>
      </div>

      <div className="mt-6 hidden overflow-auto rounded-2xl border border-zinc-200 bg-white lg:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-3">{t("listings.tableCover")}</th>
              <th className="px-3 py-3">{t("dashboard.colListingId")}</th>
              <th className="px-3 py-3">{t("dashboard.colTitle")}</th>
              <th className="px-3 py-3">{t("listings.tableCityRegion")}</th>
              <th className="px-3 py-3">{t("dashboard.colPrice")}</th>
              <th className="px-3 py-3">{t("dashboard.colStatus")}</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {listings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-zinc-400">
                  {t("listings.empty")}
                </td>
              </tr>
            ) : (
              listings.map((listing) => {
                const img = getCoverImage(listing);
                const isRemote = img.startsWith("http");
                const previewHref = `/${locale}/ilan/${listing.listing_id}`;
                return (
                  <tr key={listing.id} className="transition hover:bg-zinc-50">
                    <td className="px-3 py-2">
                      <ListingPreviewModal href={previewHref} title={listing.title} className="block cursor-pointer">
                        <div className="relative h-12 w-16 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200">
                          <Image src={img} alt="" fill className="object-cover" sizes="64px" unoptimized={isRemote} />
                        </div>
                      </ListingPreviewModal>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-500">{listing.listing_id}</td>
                    <td className="px-3 py-2 font-medium text-zinc-800">
                      <ListingPreviewModal href={previewHref} title={listing.title} className="text-left font-medium text-zinc-800 transition hover:text-emerald-700 hover:underline">
                        {listing.title}
                      </ListingPreviewModal>
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-500">
                      {displayListingCity(listing.city)} / {listing.region}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{formatMoney(Number(listing.price ?? 0), listing.currency, locale)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusClass(listing.publish_status)}`}>
                        {publishLabel(listing.publish_status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/karealfaadmin/ilanlar/${listing.id}/duzenle`}
                        className="text-sm font-semibold text-emerald-600 hover:underline"
                      >
                        {t("common.edit")}
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-3 lg:hidden">
        {listings.length === 0 ? (
          <p className="rounded-2xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-400">{t("listings.empty")}</p>
        ) : (
          listings.map((listing) => {
            const img = getCoverImage(listing);
            const isRemote = img.startsWith("http");
            const previewHref = `/${locale}/ilan/${listing.listing_id}`;
            return (
              <div key={listing.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex gap-3">
                  <ListingPreviewModal href={previewHref} title={listing.title} className="block shrink-0 cursor-pointer">
                    <div className="relative h-16 w-20 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200">
                      <Image src={img} alt="" fill className="object-cover" sizes="80px" unoptimized={isRemote} />
                    </div>
                  </ListingPreviewModal>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-zinc-500">{listing.listing_id}</p>
                    <ListingPreviewModal href={previewHref} title={listing.title} className="mt-0.5 text-left font-semibold text-zinc-900 transition hover:text-emerald-700">
                      {listing.title}
                    </ListingPreviewModal>
                    <p className="mt-1 text-xs text-zinc-500">
                      {displayListingCity(listing.city)} / {listing.region}
                    </p>
                    <p className="mt-1 tabular-nums text-sm font-medium text-zinc-800">
                      {formatMoney(Number(listing.price ?? 0), listing.currency, locale)}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusClass(listing.publish_status)}`}>
                        {publishLabel(listing.publish_status)}
                      </span>
                      <Link
                        href={`/karealfaadmin/ilanlar/${listing.id}/duzenle`}
                        className="text-sm font-semibold text-emerald-600 hover:underline"
                      >
                        {t("common.edit")}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
