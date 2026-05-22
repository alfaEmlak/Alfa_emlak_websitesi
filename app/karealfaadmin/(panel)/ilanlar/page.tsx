import Image from "next/image";
import Link from "next/link";
import {
  displayListingCity,
  excludeFromAdminListingCityFilter,
  normalizeListingCitySlug,
} from "@/lib/listing-city";
import { getPanelLocale } from "@/lib/panel-locale";
import { getPanelTranslations } from "@/lib/panel-translations";
import { requirePanelUser } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ListingActionsMenu } from "@/components/admin/ListingActionsMenu";
import { ListingPreviewModal } from "@/components/admin/ListingPreviewModal";

async function fetchDistinctListingCities(consultantAgentId?: string | null): Promise<string[]> {
  const seen = new Set<string>();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    let q = supabaseAdmin.from("listings").select("city").range(from, from + pageSize - 1);
    if (consultantAgentId) {
      q = q.eq("created_by_agent_id", consultantAgentId);
    }
    const { data, error } = await q;
    if (error) break;
    if (!data?.length) break;
    for (const row of data) {
      const c = typeof row.city === "string" ? row.city.trim() : "";
      const canon = normalizeListingCitySlug(c);
      if (canon) seen.add(canon);
    }
    if (data.length < pageSize) break;
    from += pageSize;
    if (from > 100_000) break;
  }
  return [...seen].sort((a, b) => displayListingCity(a).localeCompare(displayListingCity(b), "tr"));
}

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

export default async function AdminListingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requirePanelUser();
  const t = await getPanelTranslations();
  const locale = await getPanelLocale();
  const sp = await searchParams;
  const qId = first(sp.listingId)?.trim();
  const qTitle = first(sp.title)?.trim();
  const city = first(sp.city)?.trim();
  const kind = first(sp.kind)?.trim();
  const status = first(sp.status)?.trim();
  const agentFilter = first(sp.agent)?.trim();
  const deleteFlash = first(sp.delete)?.trim();

  const consultantAgentId = user.role === "CONSULTANT" && user.agentId ? user.agentId : null;
  const cityOptions = (await fetchDistinctListingCities(consultantAgentId)).filter(
    (c) => !excludeFromAdminListingCityFilter(c),
  );

  const agentOptions =
    user.role === "ADMIN"
      ? (
          (await supabaseAdmin.from("agents").select("id,name").order("name", { ascending: true })).data ?? []
        ).filter((a): a is { id: string; name: string } => !!a?.id)
      : [];
  const selectedAgent = agentFilter ? agentOptions.find((a) => a.id === agentFilter) : undefined;
  const agentFilterValid = !!selectedAgent;
  // Feed (101evler) ilanları danışmana created_by_agent_id ile değil, created_by_name ile bağlı.
  // Bu yüzden hem agent_id hem isim ile eşleştiriyoruz.
  const agentOrFilter = selectedAgent
    ? `created_by_agent_id.eq.${selectedAgent.id},created_by_name.eq."${selectedAgent.name.replace(/"/g, '\\"')}"`
    : "";

  let query = supabaseAdmin.from("listings").select("*, listing_images(*)");

  if (user.role !== "ADMIN" && user.agentId) {
    query = query.eq("created_by_agent_id", user.agentId);
  }

  if (qId) query = query.ilike("listing_id", `%${qId}%`);
  if (qTitle) query = query.ilike("title", `%${qTitle}%`);
  if (city && cityOptions.includes(city)) query = query.eq("city", city);
  if (kind && ["SATILIK", "KIRALIK", "GUNLUK_KIRALIK", "PROJE"].includes(kind)) query = query.eq("kind", kind);
  if (status && ["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "HIDDEN", "REJECTED"].includes(status)) query = query.eq("publish_status", status);
  if (agentOrFilter) query = query.or(agentOrFilter);

  let result = await query.order("updated_at", { ascending: false }).limit(80);
  if (result.error?.message.includes("Could not find the")) {
    let fallbackQuery = supabaseAdmin.from("listings").select("*, listing_images(*)");
    if (user.role !== "ADMIN" && user.agentId) {
      fallbackQuery = fallbackQuery.eq("created_by_agent_id", user.agentId);
    }
    if (qId) fallbackQuery = fallbackQuery.ilike("listing_id", `%${qId}%`);
    if (qTitle) fallbackQuery = fallbackQuery.ilike("title", `%${qTitle}%`);
    if (city && cityOptions.includes(city)) fallbackQuery = fallbackQuery.eq("city", city);
    if (kind && ["SATILIK", "KIRALIK", "GUNLUK_KIRALIK", "PROJE"].includes(kind)) fallbackQuery = fallbackQuery.eq("kind", kind);
    if (status && ["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "HIDDEN", "REJECTED"].includes(status)) fallbackQuery = fallbackQuery.eq("publish_status", status);
    if (agentOrFilter) fallbackQuery = fallbackQuery.or(agentOrFilter);
    result = await fallbackQuery.order("updated_at", { ascending: false }).limit(80);
  }

  const listings = (result.data ?? []) as ListingRow[];

  // Sayımlar: kapsamdaki toplam ve uygulanan filtreye göre filtrelenen ilan sayısı.
  const scopeAgentId = user.role !== "ADMIN" && user.agentId ? user.agentId : null;

  let totalCountQuery = supabaseAdmin.from("listings").select("*", { count: "exact", head: true });
  if (scopeAgentId) totalCountQuery = totalCountQuery.eq("created_by_agent_id", scopeAgentId);
  const { count: totalCountRaw } = await totalCountQuery;
  const totalCount = totalCountRaw ?? 0;

  let filteredCountQuery = supabaseAdmin.from("listings").select("*", { count: "exact", head: true });
  if (scopeAgentId) filteredCountQuery = filteredCountQuery.eq("created_by_agent_id", scopeAgentId);
  if (qId) filteredCountQuery = filteredCountQuery.ilike("listing_id", `%${qId}%`);
  if (qTitle) filteredCountQuery = filteredCountQuery.ilike("title", `%${qTitle}%`);
  if (city && cityOptions.includes(city)) filteredCountQuery = filteredCountQuery.eq("city", city);
  if (kind && ["SATILIK", "KIRALIK", "GUNLUK_KIRALIK", "PROJE"].includes(kind)) filteredCountQuery = filteredCountQuery.eq("kind", kind);
  if (status && ["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "HIDDEN", "REJECTED"].includes(status)) filteredCountQuery = filteredCountQuery.eq("publish_status", status);
  if (agentOrFilter) filteredCountQuery = filteredCountQuery.or(agentOrFilter);
  const { count: filteredCountRaw } = await filteredCountQuery;
  const filteredCount = filteredCountRaw ?? 0;

  const hasActiveFilter = !!(qId || qTitle || city || kind || status || agentFilterValid);

  const actionLabels = {
    publish: t("listings.actionPublish"),
    unpublish: t("listings.actionUnpublish"),
    edit: t("common.edit"),
    delete: t("listings.btnDelete"),
    confirmDelete: t("listings.deleteConfirm"),
    loading: t("common.loading"),
  };

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

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{user.role === "ADMIN" ? t("listings.titleAdmin") : t("listings.titleConsultant")}</h1>
          <p className="text-sm text-zinc-500">
            {user.role === "ADMIN" ? t("listings.subtitleAdmin") : t("listings.subtitleConsultant")}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/karealfaadmin/onay-bekleyen" className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50">
            {user.role === "ADMIN" ? t("listings.btnQueueAdmin") : t("listings.btnQueueConsultant")}
          </Link>
          <Link href="/karealfaadmin/ilanlar/yeni" className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700">
            {t("listings.btnNew")}
          </Link>
        </div>
      </div>

      <form className={`mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:grid-cols-2 ${user.role === "ADMIN" ? "lg:grid-cols-7" : "lg:grid-cols-6"}`}>
        <input name="listingId" placeholder={t("listings.phListingId")} defaultValue={qId ?? ""} className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25" />
        <input name="title" placeholder={t("listings.phTitle")} defaultValue={qTitle ?? ""} className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25" />
        <select
          name="city"
          defaultValue={city && cityOptions.includes(city) ? city : ""}
          className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
        >
          <option value="">{t("listings.filterCityAll")}</option>
          {cityOptions.map((c) => (
            <option key={c} value={c}>
              {displayListingCity(c)}
            </option>
          ))}
        </select>
        <select name="kind" defaultValue={kind ?? ""} className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25">
          <option value="">{t("listings.filterKindAll")}</option>
          <option value="SATILIK">{t("kindLabels.SATILIK")}</option>
          <option value="KIRALIK">{t("kindLabels.KIRALIK")}</option>
          <option value="GUNLUK_KIRALIK">{t("kindLabels.GUNLUK_KIRALIK")}</option>
          <option value="PROJE">{t("kindLabels.PROJE")}</option>
        </select>
        <select name="status" defaultValue={status ?? ""} className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25">
          <option value="">{t("listings.filterStatusAll")}</option>
          <option value="DRAFT">{t("publishStatus.DRAFT")}</option>
          <option value="PENDING_APPROVAL">{t("publishStatus.PENDING_APPROVAL")}</option>
          <option value="PUBLISHED">{t("publishStatus.PUBLISHED")}</option>
          <option value="HIDDEN">{t("publishStatus.HIDDEN")}</option>
          <option value="REJECTED">{t("publishStatus.REJECTED")}</option>
        </select>
        {user.role === "ADMIN" ? (
          <select name="agent" defaultValue={agentFilterValid ? agentFilter : ""} className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25">
            <option value="">{t("listings.filterAgentAll")}</option>
            {agentOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        ) : null}
        <button type="submit" className="min-h-[44px] rounded-xl bg-zinc-800 py-2 text-sm font-bold text-white transition hover:bg-zinc-900">
          {t("common.filter")}
        </button>
      </form>

      <p className="mt-3 text-sm text-zinc-500">
        {hasActiveFilter
          ? t("listings.countFiltered", { total: totalCount, filtered: filteredCount })
          : t("listings.countTotal", { total: totalCount })}
      </p>

      {deleteFlash === "forbidden" ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{t("listings.deleteForbidden")}</p>
      ) : null}
      {deleteFlash === "notfound" ? (
        <p className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">{t("listings.deleteNotFound")}</p>
      ) : null}
      {deleteFlash === "error" ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{t("listings.deleteError")}</p>
      ) : null}

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
                    <div className="mt-2">
                      <ListingActionsMenu
                        listingId={listing.id}
                        status={listing.publish_status}
                        statusLabel={publishLabel(listing.publish_status)}
                        editHref={`/karealfaadmin/ilanlar/${listing.id}/duzenle`}
                        labels={actionLabels}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6 hidden overflow-auto rounded-2xl border border-zinc-200 bg-white lg:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-3">{t("listings.tableCover")}</th>
              <th className="px-3 py-3">{t("dashboard.colListingId")}</th>
              <th className="px-3 py-3">{t("dashboard.colTitle")}</th>
              <th className="px-3 py-3">{t("listings.tableCityRegion")}</th>
              {user.role === "ADMIN" ? <th className="px-3 py-3">{t("listings.tableSender")}</th> : null}
              <th className="px-3 py-3">{t("dashboard.colPrice")}</th>
              <th className="px-3 py-3">{t("dashboard.colStatus")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {listings.length === 0 ? (
              <tr>
                <td colSpan={user.role === "ADMIN" ? 7 : 6} className="px-3 py-8 text-center text-sm text-zinc-400">
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
                    {user.role === "ADMIN" ? (
                      <td className="px-3 py-2 text-xs text-zinc-500">{listing.created_by_name || t("common.adminUser")}</td>
                    ) : null}
                    <td className="px-3 py-2 tabular-nums">{formatMoney(Number(listing.price ?? 0), listing.currency, locale)}</td>
                    <td className="px-3 py-2">
                      <ListingActionsMenu
                        listingId={listing.id}
                        status={listing.publish_status}
                        statusLabel={publishLabel(listing.publish_status)}
                        editHref={`/karealfaadmin/ilanlar/${listing.id}/duzenle`}
                        labels={actionLabels}
                      />
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
