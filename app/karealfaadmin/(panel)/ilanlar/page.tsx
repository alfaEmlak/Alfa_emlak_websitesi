import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { kktcCities } from "@/lib/kktc-regions";
import { displayListingCity, displayListingRegionOrNeighborhood } from "@/lib/listing-city";
import { getPanelLocale } from "@/lib/panel-locale";
import { getPanelTranslations } from "@/lib/panel-translations";
import { requirePanelUser } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ListingActionsMenu } from "@/components/admin/ListingActionsMenu";
import { ListingPreviewModal } from "@/components/admin/ListingPreviewModal";
import { ListingFilterBar } from "@/components/admin/ListingFilterBar";
import {
  adminListingFilterToParams,
  applyAdminListingFilter,
  fetchDistinctListingCities,
  fetchDistinctListingPropertyTypes,
  fetchDistinctListingRegionsByCity,
  hasAnyAdminListingFilter,
  parseAdminListingFilter,
  sanitizeAdminListingFilter,
  LISTING_KINDS,
  type AdminListingFilter,
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

const SORTS = ["newest", "price_asc", "price_desc"] as const;
type SortKey = (typeof SORTS)[number] | "";

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
      currency: currency === "TRY" ? "TRY" : currency === "GBP" ? "GBP" : currency === "USD" ? "USD" : "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${price.toLocaleString(locale)} ${currency}`;
  }
}

function StatCard({ label, value, tone, icon }: { label: string; value: number; tone: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
        <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-zinc-900">{value.toLocaleString("tr-TR")}</p>
      </div>
    </div>
  );
}

const ICON = {
  building: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path fillRule="evenodd" d="M4 3.5A1.5 1.5 0 0 1 5.5 2h9A1.5 1.5 0 0 1 16 3.5V17h1a.75.75 0 0 1 0 1.5H3A.75.75 0 0 1 3 17h1V3.5ZM7 5h2v2H7V5Zm4 0h2v2h-2V5ZM7 9h2v2H7V9Zm4 0h2v2h-2V9Zm-2 5h2v3H9v-3Z" clipRule="evenodd" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.86-9.86a.75.75 0 0 0-1.22-.88l-3.24 4.5-1.6-1.6a.75.75 0 1 0-1.06 1.06l2.22 2.22a.75.75 0 0 0 1.14-.09l3.76-5.21Z" clipRule="evenodd" />
    </svg>
  ),
  draft: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path d="M13.59 3.59a2 2 0 0 1 2.82 2.82l-8.6 8.6a2 2 0 0 1-.88.5l-3.18.85a.5.5 0 0 1-.61-.61l.85-3.18a2 2 0 0 1 .5-.88l8.6-8.6Z" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-12.25a.75.75 0 0 0-1.5 0V10c0 .2.08.39.22.53l2.75 2.75a.75.75 0 1 0 1.06-1.06l-2.53-2.53V5.75Z" clipRule="evenodd" />
    </svg>
  ),
};

export default async function AdminListingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requirePanelUser();
  const t = await getPanelTranslations();
  const locale = await getPanelLocale();
  const sp = await searchParams;
  const deleteFlash = first(sp.delete)?.trim();

  const sortRaw = first(sp.sort)?.trim() ?? "";
  const sort: SortKey = (SORTS as readonly string[]).includes(sortRaw) ? (sortRaw as SortKey) : "";
  const view = first(sp.view) === "grid" ? "grid" : "table";

  const consultantAgentId = user.role === "CONSULTANT" && user.agentId ? user.agentId : null;
  const [cities, propertyTypeOptions, regionsByCity, agentsRes] = await Promise.all([
    fetchDistinctListingCities(consultantAgentId),
    fetchDistinctListingPropertyTypes(consultantAgentId),
    fetchDistinctListingRegionsByCity(consultantAgentId),
    user.role === "ADMIN"
      ? supabaseAdmin.from("agents").select("id,name").order("name", { ascending: true })
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const cityOptions = cities.options;
  const cityLabel = (c: string) => displayListingCity(c);
  const agentOptions = (agentsRes.data ?? []).filter((a): a is { id: string; name: string } => !!a?.id);

  const scopeAgentId = user.role !== "ADMIN" && user.agentId ? user.agentId : null;
  const filterCtx: AdminListingFilterContext = {
    cityOptions,
    cityDbValues: cities.dbValues,
    propertyTypeOptions,
    agentOptions,
    scopeAgentId,
  };
  const filter = sanitizeAdminListingFilter(parseAdminListingFilter(sp), filterCtx);

  // Sayımlar: üst kartlar kapsamın tamamını, sekmeler ise (durum hariç) aktif filtreyi yansıtır.
  const countFor = async (f: AdminListingFilter) => {
    const { count } = await applyAdminListingFilter(
      supabaseAdmin.from("listings").select("*", { count: "exact", head: true }),
      f,
      filterCtx,
    );
    return count ?? 0;
  };
  const withoutStatus: AdminListingFilter = { ...filter, status: undefined };
  const TAB_STATUSES = ["PUBLISHED", "DRAFT", "PENDING_APPROVAL", "HIDDEN", "REJECTED"] as const;

  const [
    totalCount,
    scopePublished,
    scopeDraft,
    scopePending,
    filteredCount,
    tabAllCount,
    ...tabCounts
  ] = await Promise.all([
    countFor({}),
    countFor({ status: "PUBLISHED" }),
    countFor({ status: "DRAFT" }),
    countFor({ status: "PENDING_APPROVAL" }),
    countFor(filter),
    countFor(withoutStatus),
    ...TAB_STATUSES.map((s) => countFor({ ...withoutStatus, status: s })),
  ]);

  // Sayfalama: sayfa başına 50 ilan.
  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const pageRaw = Number(first(sp.page) ?? "1");
  const page = Math.min(Math.max(Number.isFinite(pageRaw) ? Math.floor(pageRaw) : 1, 1), totalPages);
  const rangeFrom = (page - 1) * PAGE_SIZE;
  const rangeTo = rangeFrom + PAGE_SIZE - 1;

  let listQuery = applyAdminListingFilter(
    supabaseAdmin.from("listings").select("*, listing_images(*)"),
    filter,
    filterCtx,
  );
  if (sort === "price_asc") listQuery = listQuery.order("price", { ascending: true });
  else if (sort === "price_desc") listQuery = listQuery.order("price", { ascending: false });
  else if (sort === "newest") listQuery = listQuery.order("created_at", { ascending: false });
  else listQuery = listQuery.order("updated_at", { ascending: false });
  // Aynı değerli satırlarda sayfalar arası kayma olmasın.
  const result = await listQuery.order("id", { ascending: true }).range(rangeFrom, rangeTo);

  const listings = (result.data ?? []) as ListingRow[];

  // Aktif filtreler + görünüm/sıralama — sayfalama bağlantıları ve silme sonrası dönüş için.
  const stateParams = () => {
    const params = adminListingFilterToParams(filter);
    if (sort) params.set("sort", sort);
    if (view === "grid") params.set("view", "grid");
    return params;
  };

  const pageHref = (target: number) => {
    const params = stateParams();
    params.set("page", String(target));
    return `?${params.toString()}`;
  };

  // Silme işlemi sunucuda redirect ettiği için filtreler bu adresle taşınır.
  const returnTo = (() => {
    const params = stateParams();
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
      case "PENDING_APPROVAL":
      case "PUBLISHED":
      case "HIDDEN":
      case "REJECTED":
        return t(`publishStatus.${code}`);
      default:
        return code;
    }
  }

  const statusTabs = [
    { value: "", label: t("listings.tabAll"), count: tabAllCount },
    ...TAB_STATUSES.map((s, i) => ({ value: s as string, label: publishLabel(s), count: tabCounts[i] ?? 0 })),
  ].filter((tab) => tab.value === "" || tab.count > 0 || tab.value === filter.status || tab.value === "PUBLISHED" || tab.value === "DRAFT" || tab.value === "PENDING_APPROVAL");

  // Toplu işlemler yalnızca ADMIN'e açık.
  const bulkEnabled = user.role === "ADMIN";
  const bulkLabels = bulkEnabled ? buildBulkBarLabels(t) : null;
  const bulkDrawerLabels = bulkEnabled ? buildBulkDrawerLabels(t) : null;
  const bulkOptions: BulkDrawerOptions | null = bulkEnabled
    ? {
        agents: agentOptions,
        // Toplu şehir düzeltmesi yalnızca gerçek 6 şehirden birini yazabilir.
        cities: kktcCities.filter((c) => c.v).map((c) => ({ value: c.v, label: c.l })),
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

  const emptyBox = (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-12 text-center">
      <p className="text-sm font-bold text-zinc-700">{hasActiveFilter ? t("listings.emptyFiltered") : t("listings.empty")}</p>
      {hasActiveFilter ? <p className="mt-1 text-xs text-zinc-400">{t("listings.emptyFilteredHint")}</p> : null}
    </div>
  );

  const actionsMenu = (listing: ListingRow) => (
    <ListingActionsMenu
      listingId={listing.id}
      status={listing.publish_status}
      statusLabel={publishLabel(listing.publish_status)}
      editHref={`/karealfaadmin/ilanlar/${listing.id}/duzenle`}
      returnTo={returnTo}
      labels={actionLabels}
    />
  );

  const editIcon = (listing: ListingRow) => (
    <Link
      href={`/karealfaadmin/ilanlar/${listing.id}/duzenle`}
      title={t("common.edit")}
      aria-label={t("common.edit")}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition hover:bg-emerald-50 hover:text-emerald-700"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
        <path d="M13.59 3.59a2 2 0 0 1 2.82 2.82l-8.6 8.6a2 2 0 0 1-.88.5l-3.18.85a.5.5 0 0 1-.61-.61l.85-3.18a2 2 0 0 1 .5-.88l8.6-8.6Z" />
      </svg>
    </Link>
  );

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
          <Link href="/karealfaadmin/ilanlar/yeni" className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700">
            {t("listings.btnNew")}
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label={t("listings.statTotal")} value={totalCount} tone="bg-blue-50 text-blue-600" icon={ICON.building} />
        <StatCard label={t("listings.statPublished")} value={scopePublished} tone="bg-emerald-50 text-emerald-600" icon={ICON.check} />
        <StatCard label={t("listings.statDraft")} value={scopeDraft} tone="bg-amber-50 text-amber-600" icon={ICON.draft} />
        <StatCard label={t("listings.statPending")} value={scopePending} tone="bg-fuchsia-50 text-fuchsia-600" icon={ICON.clock} />
      </div>

      <ListingFilterBar
        values={{
          q: filter.q ?? filter.listingId ?? filter.title ?? "",
          city: filter.city ?? "",
          region: filter.region ?? "",
          kind: filter.kind ?? "",
          propertyType: filter.propertyType ?? "",
          status: filter.status ?? "",
          agent: filter.agent ?? "",
          minPrice: filter.minPrice ?? "",
          maxPrice: filter.maxPrice ?? "",
          sort,
          view: view === "grid" ? "grid" : "",
        }}
        cityOptions={cityOptions.map((c) => ({ value: c, label: cityLabel(c) }))}
        regionsByCity={regionsByCity}
        kindOptions={LISTING_KINDS.map((k) => ({ value: k, label: t(`kindLabels.${k}`) }))}
        propertyTypeOptions={propertyTypeOptions.map((o) => ({ value: o.rawValueKey, label: o.displayLabel }))}
        agentOptions={user.role === "ADMIN" ? agentOptions.map((a) => ({ value: a.id, label: a.name })) : null}
        statusTabs={statusTabs}
        labels={{
          searchPh: t("listings.searchPh"),
          cityAll: t("listings.filterCityAll"),
          regionAll: t("listings.filterRegionAll"),
          regionPickCity: t("listings.filterRegionPickCity"),
          kindAll: t("listings.filterKindAll"),
          propertyTypeAll: t("listings.filterPropertyTypeAll"),
          agentAll: t("listings.filterAgentAll"),
          priceRange: t("listings.priceRange"),
          priceMin: t("listings.priceMin"),
          priceMax: t("listings.priceMax"),
          reset: t("listings.resetFilters"),
          viewTable: t("listings.viewTable"),
          viewGrid: t("listings.viewGrid"),
          sortUpdated: t("listings.sortUpdated"),
          sortNewest: t("listings.sortNewest"),
          sortPriceAsc: t("listings.sortPriceAsc"),
          sortPriceDesc: t("listings.sortPriceDesc"),
          updating: t("listings.updating"),
        }}
      />

      <div className="mt-4 flex items-center justify-between gap-3 px-1 text-sm text-zinc-500">
        <p>
          {hasActiveFilter
            ? t("listings.countFiltered", { total: totalCount, filtered: filteredCount })
            : t("listings.resultCount", { count: filteredCount })}
        </p>
        {bulkEnabled && listings.length > 0 ? (
          <label className={`flex cursor-pointer items-center gap-2 font-medium text-zinc-700 ${view === "grid" ? "" : "lg:hidden"}`}>
            <BulkHeaderCheckbox label={t("bulk.selectPage")} />
            {t("bulk.selectPage")}
          </label>
        ) : null}
      </div>

      {deleteFlash === "forbidden" ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{t("listings.deleteForbidden")}</p>
      ) : null}
      {deleteFlash === "notfound" ? (
        <p className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">{t("listings.deleteNotFound")}</p>
      ) : null}
      {deleteFlash === "error" ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{t("listings.deleteError")}</p>
      ) : null}

      {view === "grid" ? (
        <div className="mt-4">
          {listings.length === 0 ? (
            emptyBox
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => {
                const img = getCoverImage(listing);
                const isRemote = img.startsWith("http");
                const previewHref = `/${locale}/ilan/${listing.listing_id}`;
                return (
                  <div key={listing.id} className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md">
                    <div className="relative h-44 bg-zinc-100">
                      <ListingPreviewModal href={previewHref} title={listing.title} className="absolute inset-0 block cursor-pointer">
                        <Image src={img} alt="" fill className="object-cover" sizes="(min-width:1280px) 33vw, (min-width:640px) 50vw, 100vw" unoptimized={isRemote} />
                      </ListingPreviewModal>
                      {bulkEnabled ? (
                        <span className="absolute right-3 top-3 rounded-md bg-white/90 p-1 shadow">
                          <BulkRowCheckbox id={listing.id} label={listing.title} />
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                      <div>
                        <div className="flex items-center justify-between gap-2 font-mono text-xs text-zinc-400">
                          <span>{listing.listing_id}</span>
                          <span className="font-sans text-sm font-bold tabular-nums text-emerald-700">
                            {formatMoney(Number(listing.price ?? 0), listing.currency, locale)}
                          </span>
                        </div>
                        <ListingPreviewModal href={previewHref} title={listing.title} className="mt-1 line-clamp-2 text-left text-sm font-bold text-zinc-900 transition hover:text-emerald-700">
                          {listing.title}
                        </ListingPreviewModal>
                        <p className="mt-1 text-xs text-zinc-500">
                          {displayListingCity(listing.city)} / {displayListingRegionOrNeighborhood(listing.region)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-3">
                        <span className="truncate text-xs font-medium text-zinc-600">
                          {user.role === "ADMIN" ? listing.created_by_name || t("common.adminUser") : ""}
                        </span>
                        <div className="flex items-center gap-2">
                          {editIcon(listing)}
                          {actionsMenu(listing)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-3 lg:hidden">
            {listings.length === 0
              ? emptyBox
              : listings.map((listing, idx) => {
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
                            {displayListingCity(listing.city)} / {displayListingRegionOrNeighborhood(listing.region)}
                          </p>
                          <p className="mt-1 text-sm font-bold tabular-nums text-zinc-900">
                            {formatMoney(Number(listing.price ?? 0), listing.currency, locale)}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            {actionsMenu(listing)}
                            {editIcon(listing)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
          </div>

          <div className="mt-4 hidden overflow-auto rounded-2xl border border-zinc-200 bg-white shadow-sm lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                <tr>
                  {bulkEnabled ? (
                    <th className="w-10 px-3 py-3.5">
                      <BulkHeaderCheckbox label={t("bulk.selectPage")} />
                    </th>
                  ) : null}
                  <th className="w-10 px-3 py-3.5 text-right">#</th>
                  <th className="px-3 py-3.5">{t("listings.tableCover")}</th>
                  <th className="px-3 py-3.5">{t("dashboard.colListingId")}</th>
                  <th className="px-3 py-3.5">{t("dashboard.colTitle")}</th>
                  <th className="px-3 py-3.5">{t("listings.tableCityRegion")}</th>
                  {user.role === "ADMIN" ? <th className="px-3 py-3.5">{t("listings.tableSender")}</th> : null}
                  <th className="px-3 py-3.5">{t("dashboard.colPrice")}</th>
                  <th className="px-3 py-3.5">{t("dashboard.colStatus")}</th>
                  <th className="px-3 py-3.5"><span className="sr-only">{t("common.edit")}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {listings.length === 0 ? (
                  <tr>
                    <td colSpan={(user.role === "ADMIN" ? 9 : 8) + (bulkEnabled ? 1 : 0)} className="px-3 py-10 text-center">
                      <p className="text-sm font-bold text-zinc-700">{hasActiveFilter ? t("listings.emptyFiltered") : t("listings.empty")}</p>
                      {hasActiveFilter ? <p className="mt-1 text-xs text-zinc-400">{t("listings.emptyFilteredHint")}</p> : null}
                    </td>
                  </tr>
                ) : (
                  listings.map((listing, idx) => {
                    const img = getCoverImage(listing);
                    const isRemote = img.startsWith("http");
                    const previewHref = `/${locale}/ilan/${listing.listing_id}`;
                    return (
                      <tr key={listing.id} className="transition hover:bg-zinc-50/80">
                        {bulkEnabled ? (
                          <td className="px-3 py-2.5">
                            <BulkRowCheckbox id={listing.id} label={listing.title} />
                          </td>
                        ) : null}
                        <td className="px-3 py-2.5 text-right text-xs tabular-nums text-zinc-400">{rangeFrom + idx + 1}</td>
                        <td className="px-3 py-2.5">
                          <ListingPreviewModal href={previewHref} title={listing.title} className="block cursor-pointer">
                            <div className="relative h-12 w-16 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200">
                              <Image src={img} alt="" fill className="object-cover transition hover:scale-105" sizes="64px" unoptimized={isRemote} />
                            </div>
                          </ListingPreviewModal>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs font-semibold text-zinc-500">{listing.listing_id}</td>
                        <td className="max-w-xs px-3 py-2.5 font-medium text-zinc-900">
                          <ListingPreviewModal href={previewHref} title={listing.title} className="line-clamp-2 text-left font-medium text-zinc-900 transition hover:text-emerald-700">
                            {listing.title}
                          </ListingPreviewModal>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-zinc-500">
                          {displayListingCity(listing.city)} / {displayListingRegionOrNeighborhood(listing.region)}
                        </td>
                        {user.role === "ADMIN" ? (
                          <td className="px-3 py-2.5 text-xs font-medium text-zinc-700">{listing.created_by_name || t("common.adminUser")}</td>
                        ) : null}
                        <td className="whitespace-nowrap px-3 py-2.5 font-bold tabular-nums text-zinc-900">
                          {formatMoney(Number(listing.price ?? 0), listing.currency, locale)}
                        </td>
                        <td className="px-3 py-2.5">{actionsMenu(listing)}</td>
                        <td className="px-3 py-2.5 text-right">{editIcon(listing)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

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
