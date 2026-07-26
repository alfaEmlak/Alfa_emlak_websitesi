import { normalizeListingCitySlug } from "@/lib/listing-city";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  parseListingPropertyType,
  LISTING_CATEGORY_LABEL_TR,
  LISTING_SUBTYPE_LABEL_TR,
} from "@/lib/listing-property-taxonomy";

/**
 * İlanlar sayfasındaki filtre mantığının tek kaynağı.
 *
 * Aynı zincir hem sayfa listesi, hem sayaçlar, hem de toplu işlemlerin
 * "filtreye uyan tüm ilanlar" kapsamı tarafından kullanılır — kullanıcının
 * ekranda gördüğü adet ile toplu işlemin etkilediği adet böylece aynı olur.
 */

export const LISTING_KINDS = ["SATILIK", "KIRALIK", "GUNLUK_KIRALIK", "PROJE"] as const;
export const LISTING_PUBLISH_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "PUBLISHED",
  "HIDDEN",
  "REJECTED",
] as const;

/**
 * Filtrenin şekli istemci tarafıyla ortak; tanım tek yerde dursun diye
 * bulk-types'tan alınıyor (tip-only import, çalışma zamanına sızmaz).
 */
export type { AdminListingFilter } from "@/components/admin/bulk-types";
import type { AdminListingFilter } from "@/components/admin/bulk-types";

export type PropertyTypeOption = {
  displayLabel: string;
  dbValues: string[];
  rawValueKey: string;
};

export type AgentOption = { id: string; name: string };

/** Filtrenin uygulanabilmesi için gereken, sayfada zaten üretilen seçenek listeleri. */
export type AdminListingFilterContext = {
  cityOptions: string[];
  propertyTypeOptions: PropertyTypeOption[];
  agentOptions: AgentOption[];
  /** ADMIN olmayan kullanıcıyı kendi ilanlarına kilitler. */
  scopeAgentId?: string | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseAdminListingFilter(sp: SearchParams): AdminListingFilter {
  return {
    listingId: first(sp.listingId)?.trim() || undefined,
    title: first(sp.title)?.trim() || undefined,
    city: first(sp.city)?.trim() || undefined,
    kind: first(sp.kind)?.trim() || undefined,
    propertyType: first(sp.propertyType)?.trim() || undefined,
    status: first(sp.status)?.trim() || undefined,
    agent: first(sp.agent)?.trim() || undefined,
  };
}

/** Ham girdiyi bilinen seçeneklere göre doğrular; geçersiz değerler düşer. */
export function sanitizeAdminListingFilter(
  filter: AdminListingFilter,
  ctx: AdminListingFilterContext,
): AdminListingFilter {
  const out: AdminListingFilter = {};
  if (filter.listingId) out.listingId = filter.listingId;
  if (filter.title) out.title = filter.title;
  if (filter.city && ctx.cityOptions.includes(filter.city)) out.city = filter.city;
  if (filter.kind && (LISTING_KINDS as readonly string[]).includes(filter.kind)) out.kind = filter.kind;
  if (filter.propertyType && ctx.propertyTypeOptions.some((o) => o.rawValueKey === filter.propertyType)) {
    out.propertyType = filter.propertyType;
  }
  if (filter.status && (LISTING_PUBLISH_STATUSES as readonly string[]).includes(filter.status)) {
    out.status = filter.status;
  }
  if (filter.agent && ctx.agentOptions.some((a) => a.id === filter.agent)) out.agent = filter.agent;
  return out;
}

/**
 * Feed (101evler) ilanları danışmana created_by_agent_id ile değil, created_by_name
 * ile bağlı. Bu yüzden hem agent id hem isim ile eşleştiriyoruz.
 */
export function buildAgentOrFilter(agent: AgentOption): string {
  return `created_by_agent_id.eq.${agent.id},created_by_name.eq."${agent.name.replace(/"/g, '\\"')}"`;
}

/**
 * Filtreyi bir PostgREST sorgusuna uygular. Çöp kutusundaki ilanlar her zaman elenir.
 * Dönen tip girdiyle aynıdır; çağıran zincirlemeye devam edebilir.
 */
export function applyAdminListingFilter<T>(
  query: T,
  filter: AdminListingFilter,
  ctx: AdminListingFilterContext,
): T {
  const f = sanitizeAdminListingFilter(filter, ctx);
  // Supabase sorgu kurucusu her adımda kendi tipini yeniden türetiyor; jenerik T
  // üzerinden zincirlemek TS2589'a (aşırı derin tip) yol açtığı için burada
  // minimum arayüze indirip sonunda geri çeviriyoruz.
  let q = query as unknown as AdminListingQuery;

  q = q.is("deleted_at", null);

  if (ctx.scopeAgentId) q = q.eq("created_by_agent_id", ctx.scopeAgentId);
  if (f.listingId) q = q.ilike("listing_id", `%${f.listingId}%`);
  if (f.title) q = q.ilike("title", `%${f.title}%`);
  if (f.city) q = q.eq("city", f.city);
  if (f.kind) q = q.eq("kind", f.kind);

  if (f.propertyType) {
    const option = ctx.propertyTypeOptions.find((o) => o.rawValueKey === f.propertyType);
    const values = option?.dbValues ?? [];
    if (values.length === 1) q = q.eq("property_type", values[0]);
    else if (values.length > 1) q = q.in("property_type", values);
  }

  if (f.status) q = q.eq("publish_status", f.status);

  if (f.agent) {
    const agent = ctx.agentOptions.find((a) => a.id === f.agent);
    if (agent) q = q.or(buildAgentOrFilter(agent));
  }

  return q as unknown as T;
}

/** applyAdminListingFilter'ın ihtiyaç duyduğu minimum PostgREST arayüzü. */
type AdminListingQuery = {
  is(column: string, value: null): AdminListingQuery;
  eq(column: string, value: string): AdminListingQuery;
  ilike(column: string, pattern: string): AdminListingQuery;
  in(column: string, values: readonly string[]): AdminListingQuery;
  or(filters: string): AdminListingQuery;
};

/** Aktif filtre var mı — "filtrelenen / toplam" metnini seçmek için. */
export function hasAnyAdminListingFilter(filter: AdminListingFilter): boolean {
  return Object.values(filter).some((v) => typeof v === "string" && v.length > 0);
}

/** Filtreyi querystring'e çevirir (sayfalama bağlantıları ve returnTo için). */
export function adminListingFilterToParams(filter: AdminListingFilter): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.listingId) params.set("listingId", filter.listingId);
  if (filter.title) params.set("title", filter.title);
  if (filter.city) params.set("city", filter.city);
  if (filter.kind) params.set("kind", filter.kind);
  if (filter.propertyType) params.set("propertyType", filter.propertyType);
  if (filter.status) params.set("status", filter.status);
  if (filter.agent) params.set("agent", filter.agent);
  return params;
}

export function displayListingPropertyType(stored: string): string {
  const { category, subtypeKey } = parseListingPropertyType(stored);
  const catLabel = LISTING_CATEGORY_LABEL_TR[category] || category;
  const subLabel = LISTING_SUBTYPE_LABEL_TR[subtypeKey];
  return subLabel ? `${catLabel} · ${subLabel}` : catLabel;
}

/** Filtre açılırlarını besleyen ayrık değer taramaları (çöp kutusu hariç). */
export async function fetchDistinctListingCities(consultantAgentId?: string | null): Promise<string[]> {
  const seen = new Set<string>();
  for await (const rows of iterateListingColumn<{ city: unknown }>("city", consultantAgentId)) {
    for (const row of rows) {
      const canon = normalizeListingCitySlug(typeof row.city === "string" ? row.city.trim() : "");
      if (canon) seen.add(canon);
    }
  }
  return [...seen];
}

export async function fetchDistinctListingPropertyTypes(
  consultantAgentId?: string | null,
): Promise<PropertyTypeOption[]> {
  const seen = new Set<string>();
  for await (const rows of iterateListingColumn<{ property_type: unknown }>("property_type", consultantAgentId)) {
    for (const row of rows) {
      const p = typeof row.property_type === "string" ? row.property_type.trim() : "";
      if (p) seen.add(p);
    }
  }

  const groups = new Map<string, string[]>();
  for (const dbVal of seen) {
    const label = displayListingPropertyType(dbVal);
    const bucket = groups.get(label);
    if (bucket) bucket.push(dbVal);
    else groups.set(label, [dbVal]);
  }

  return [...groups.entries()]
    .map(([displayLabel, dbValues]) => {
      const sorted = [...dbValues].sort();
      return { displayLabel, dbValues: sorted, rawValueKey: sorted.join(",") };
    })
    .sort((a, b) => a.displayLabel.localeCompare(b.displayLabel, "tr"));
}

async function* iterateListingColumn<T>(column: string, consultantAgentId?: string | null) {
  const pageSize = 1000;
  for (let from = 0; from <= 100_000; from += pageSize) {
    let q = supabaseAdmin
      .from("listings")
      .select(column)
      .is("deleted_at", null)
      .range(from, from + pageSize - 1);
    if (consultantAgentId) q = q.eq("created_by_agent_id", consultantAgentId);

    const { data, error } = await q;
    if (error || !data?.length) return;
    yield data as unknown as T[];
    if (data.length < pageSize) return;
  }
}
