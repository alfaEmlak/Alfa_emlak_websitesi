import Image from "next/image";
import Link from "next/link";
import { displayListingCity, excludeFromAdminListingCityFilter } from "@/lib/listing-city";
import { getPanelLocale } from "@/lib/panel-locale";
import { getPanelTranslations } from "@/lib/panel-translations";
import { requirePanelUser } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ListingActionsMenu } from "@/components/admin/ListingActionsMenu";
import { ListingPreviewModal } from "@/components/admin/ListingPreviewModal";
import {
  adminListingFilterToParams,
  applyAdminListingFilter,
  fetchDistinctListingCities,
  fetchDistinctListingPropertyTypes,
  hasAnyAdminListingFilter,
  parseAdminListingFilter,
  sanitizeAdminListingFilter,
  LISTING_KINDS,
  type AdminListingFilterContext,
} from "@/lib/admin-listing-filter";
import {
  BulkHeaderCheckbox,
  BulkRowCheckbox,
  BulkSelectionProvider,
} from "@/components/admin/BulkSelectionProvider";
import { BulkActionsBar } from "@/components/admin/BulkActionsBar";
import type { BulkDrawerOptions } from "@/components/admin/BulkActionsDrawer";
import { buildBulkBarLabels, buildBulkDrawerLabels } from "@/lib/bulk-labels";

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
  const deleteFlash = first(sp.delete)?.trim();

  const consultantAgentId = user.role === "CONSULTANT" && user.agentId ? user.agentId : null;
  const cityOptions = (await fetchDistinctListingCities(consultantAgentId))
    .filter((c) => !excludeFromAdminListingCityFilter(c))
    .sort((a, b) => displayListingCity(a).localeCompare(displayListingCity(b), "tr"));
  const propertyTypeOptions = await fetchDistinctListingPropertyTypes(consultantAgentId);

  const agentOptions =
    user.role === "ADMIN"
      ? (
          (await supabaseAdmin.from("agents").select("id,name").order("name", { ascending: true })).data ?? []
        ).filter((a): a is { id: string; name: string } => !!a?.id)
      : [];

  // Sayımlar (sayfalamadan önce): kapsamdaki toplam ve uygulanan filtreye göre filtrelenen ilan sayısı.
  const scopeAgentId = user.role !== "ADMIN" && user.agentId ? user.agentId : null;
  const filterCtx: AdminListingFilterContext = {
    cityOptions,
    propertyTypeOptions,
    agentOptions,
    scopeAgentId,
  };
  const filter = sanitizeAdminListingFilter(parseAdminListingFilter(sp), filterCtx);
  const selectedPropertyTypeOption = filter.propertyType
    ? propertyTypeOptions.find((o) => o.rawValueKey === filter.propertyType)
    : undefined;

  let totalCountQuery = supabaseAdmin
    .from("listings")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null);
  if (scopeAgentId) totalCountQuery = totalCountQuery.eq("created_by_agent_id", scopeAgentId);
  const { count: totalCountRaw } = await totalCountQuery;
  const totalCount = totalCountRaw ?? 0;

  const { count: filteredCountRaw } = await applyAdminListingFilter(
    supabaseAdmin.from("listings").select("*", { count: "exact", head: true }),
    filter,
    filterCtx,
  );
  const filteredCount = filteredCountRaw ?? 0;

  // Sayfalama: sayfa başına 50 ilan.
  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const pageRaw = Number(first(sp.page) ?? "1");
  const page = Math.min(Math.max(Number.isFinite(pageRaw) ? Math.floor(pageRaw) : 1, 1), totalPages);
  const rangeFrom = (page - 1) * PAGE_SIZE;
  const rangeTo = rangeFrom + PAGE_SIZE - 1;

  const result = await applyAdminListingFilter(
    supabaseAdmin.from("listings").select("*, listing_images(*)"),
    filter,
    filterCtx,
  )
    .order("updated_at", { ascending: false })
    .range(rangeFrom, rangeTo);

  const listings = (result.data ?? []) as ListingRow[];

  // Aktif filtreler — hem sayfalama bağlantıları hem de silme sonrası
  // geri dönüş adresi için tek kaynaktan üretilir.
  const filterParams = () => adminListingFilterToParams(filter);

  const pageHref = (target: number) => {
    const params = filterParams();
    params.set("page", String(target));
    return `?${params.toString()}`;
  };

  // Silme işlemi sunucuda redirect ettiği için filtreler bu adresle taşınır.
  const returnTo = (() => {
    const params = filterParams();
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `/karealfaadmin/ilanlar?${qs}` : "/karealfaadmin/ilanlar";
  })();

  const hasActiveFilter = hasAnyAdminListingFilter(filter);

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

  // Toplu işlemler yalnızca ADMIN'e açık.
  const bulkEnabled = user.role === "ADMIN";
  const bulkLabels = bulkEnabled ? buildBulkBarLabels(t) : null;
  const bulkDrawerLabels = bulkEnabled ? buildBulkDrawerLabels(t) : null;
  const bulkOptions: BulkDrawerOptions | null = bulkEnabled
    ? {
        agents: agentOptions,
        cities: cityOptions.map((c) => ({ value: c, label: displayListingCity(c) })),
        // Toplu düzeltmede tek bir db değeri yazılabilir; birleşik gruplar dışarıda kalır.
        propertyTypes: propertyTypeOptions
          .filter((o) => o.dbValues.length === 1)
          .map((o) => ({ value: o.dbValues[0], label: o.displayLabel })),
        kinds: LISTING_KINDS.map((k) => ({ value: k, label: t(`kindLabels.${k}`) })),
        statusLabels: {
          PUBLISHED: t("publishStatus.PUBLISHED"),
          DRAFT: t("publishStatus.DRAFT"),
          HIDDEN: t("publishStatus.HIDDEN"),
        },
      }
    : null;

  const content = (
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

      <form className={`mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:grid-cols-2 ${user.role === "ADMIN" ? "lg:grid-cols-8" : "lg:grid-cols-7"}`}>
        <input name="listingId" placeholder={t("listings.phListingId")} defaultValue={filter.listingId ?? ""} className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25" />
        <input name="title" placeholder={t("listings.phTitle")} defaultValue={filter.title ?? ""} className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25" />
        <select
          name="city"
          defaultValue={filter.city ?? ""}
          className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
        >
          <option value="">{t("listings.filterCityAll")}</option>
          {cityOptions.map((c) => (
            <option key={c} value={c}>
              {displayListingCity(c)}
            </option>
          ))}
        </select>
        <select name="kind" defaultValue={filter.kind ?? ""} className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25">
          <option value="">{t("listings.filterKindAll")}</option>
          <option value="SATILIK">{t("kindLabels.SATILIK")}</option>
          <option value="KIRALIK">{t("kindLabels.KIRALIK")}</option>
          <option value="GUNLUK_KIRALIK">{t("kindLabels.GUNLUK_KIRALIK")}</option>
          <option value="PROJE">{t("kindLabels.PROJE")}</option>
        </select>
        <select
          name="propertyType"
          defaultValue={selectedPropertyTypeOption ? selectedPropertyTypeOption.rawValueKey : ""}
          className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
        >
          <option value="">{t("listings.filterPropertyTypeAll") || "Emlak tipi (tümü)"}</option>
          {propertyTypeOptions.map((opt) => (
            <option key={opt.rawValueKey} value={opt.rawValueKey}>
              {opt.displayLabel}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={filter.status ?? ""} className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25">
          <option value="">{t("listings.filterStatusAll")}</option>
          <option value="DRAFT">{t("publishStatus.DRAFT")}</option>
          <option value="PENDING_APPROVAL">{t("publishStatus.PENDING_APPROVAL")}</option>
          <option value="PUBLISHED">{t("publishStatus.PUBLISHED")}</option>
          <option value="HIDDEN">{t("publishStatus.HIDDEN")}</option>
          <option value="REJECTED">{t("publishStatus.REJECTED")}</option>
        </select>
        {user.role === "ADMIN" ? (
          <select name="agent" defaultValue={filter.agent ?? ""} className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25">
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
          listings.map((listing, idx) => {
            const img = getCoverImage(listing);
            const isRemote = img.startsWith("http");
            const previewHref = `/${locale}/ilan/${listing.listing_id}`;
            return (
              <div key={listing.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex gap-3">
                  {bulkEnabled ? (
                    <span className="mt-1 shrink-0">
                      <BulkRowCheckbox id={listing.id} label={listing.title} />
                    </span>
                  ) : null}
                  <span className="mt-1 shrink-0 text-xs font-semibold tabular-nums text-zinc-400">{rangeFrom + idx + 1}</span>
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
                        returnTo={returnTo}
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
              {bulkEnabled ? (
                <th className="w-10 px-3 py-3">
                  <BulkHeaderCheckbox label={t("bulk.selectPage")} />
                </th>
              ) : null}
              <th className="w-10 px-3 py-3 text-right">#</th>
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
                <td colSpan={(user.role === "ADMIN" ? 8 : 7) + (bulkEnabled ? 1 : 0)} className="px-3 py-8 text-center text-sm text-zinc-400">
                  {t("listings.empty")}
                </td>
              </tr>
            ) : (
              listings.map((listing, idx) => {
                const img = getCoverImage(listing);
                const isRemote = img.startsWith("http");
                const previewHref = `/${locale}/ilan/${listing.listing_id}`;
                return (
                  <tr key={listing.id} className="transition hover:bg-zinc-50">
                    {bulkEnabled ? (
                      <td className="px-3 py-2">
                        <BulkRowCheckbox id={listing.id} label={listing.title} />
                      </td>
                    ) : null}
                    <td className="px-3 py-2 text-right text-xs tabular-nums text-zinc-400">{rangeFrom + idx + 1}</td>
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
                        returnTo={returnTo}
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

      {totalPages > 1 ? (
        <nav className="mt-5 flex flex-wrap items-center justify-center gap-1.5 text-sm">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 font-medium text-zinc-700 transition hover:bg-zinc-50">‹</Link>
          ) : (
            <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-zinc-100 bg-zinc-50 px-3 font-medium text-zinc-300">‹</span>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | "gap")[]>((acc, p) => {
              const prev = acc[acc.length - 1];
              if (typeof prev === "number" && p - prev > 1) acc.push("gap");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "gap" ? (
                <span key={`gap-${i}`} className="px-1.5 text-zinc-400">…</span>
              ) : p === page ? (
                <span key={p} className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-emerald-600 px-3 font-bold text-white">{p}</span>
              ) : (
                <Link key={p} href={pageHref(p)} className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 font-medium text-zinc-700 transition hover:bg-zinc-50">{p}</Link>
              ),
            )}
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 font-medium text-zinc-700 transition hover:bg-zinc-50">›</Link>
          ) : (
            <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-zinc-100 bg-zinc-50 px-3 font-medium text-zinc-300">›</span>
          )}
        </nav>
      ) : null}

      {bulkEnabled && bulkLabels && bulkDrawerLabels && bulkOptions ? (
        <BulkActionsBar labels={bulkLabels} drawerLabels={bulkDrawerLabels} options={bulkOptions} />
      ) : null}
    </div>
  );

  if (!bulkEnabled) return content;

  return (
    <BulkSelectionProvider
      pageIds={listings.map((l) => l.id)}
      filteredCount={filteredCount}
      filter={filter}
    >
      {content}
    </BulkSelectionProvider>
  );
}
