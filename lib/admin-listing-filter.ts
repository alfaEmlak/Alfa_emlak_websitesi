import { displayListingRegionOrNeighborhood, expandListingCityFilterValues, resolveListingParentCitySlug } from "@/lib/listing-city";
import { kktcCities } from "@/lib/kktc-regions";
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
  /** Şehir slug'ları: yalnızca KKTC'nin 6 büyük şehri. */
  cityOptions: string[];
  /** Şehir seçeneği → veritabanındaki tüm ham `city` değerleri (köy/mahalle yazımları dahil). */
  cityDbValues?: Record<string, string[]>;
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
    q: first(sp.q)?.trim() || undefined,
    listingId: first(sp.listingId)?.trim() || undefined,
    title: first(sp.title)?.trim() || undefined,
    city: first(sp.city)?.trim() || undefined,
    kind: first(sp.kind)?.trim() || undefined,
    propertyType: first(sp.propertyType)?.trim() || undefined,
    status: first(sp.status)?.trim() || undefined,
    agent: first(sp.agent)?.trim() || undefined,
    region: first(sp.region)?.trim() || undefined,
    minPrice: first(sp.minPrice)?.trim() || undefined,
    maxPrice: first(sp.maxPrice)?.trim() || undefined,
  };
}

/** PostgREST or() ifadesini bozabilecek karakterleri ayıklar. */
function cleanSearchTerm(raw: string): string {
  return raw.replace(/[,()"\\%*]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
}

function cleanPrice(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const n = Number(raw.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? String(n) : undefined;
}

/** Ham girdiyi bilinen seçeneklere göre doğrular; geçersiz değerler düşer. */
export function sanitizeAdminListingFilter(
  filter: AdminListingFilter,
  ctx: AdminListingFilterContext,
): AdminListingFilter {
  const out: AdminListingFilter = {};
  if (filter.q) {
    const q = cleanSearchTerm(filter.q);
    if (q) out.q = q;
  }
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
  // Bölge yalnızca şehirle birlikte anlamlı (açılır liste şehre bağlı).
  if (out.city && filter.region) out.region = filter.region.slice(0, 600);
  const minPrice = cleanPrice(filter.minPrice);
  const maxPrice = cleanPrice(filter.maxPrice);
  if (minPrice) out.minPrice = minPrice;
  if (maxPrice) out.maxPrice = maxPrice;
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
  if (f.q) q = q.or(`listing_id.ilike."%${f.q}%",title.ilike."%${f.q}%"`);
  if (f.listingId) q = q.ilike("listing_id", `%${f.listingId}%`);
  if (f.title) q = q.ilike("title", `%${f.title}%`);
  if (f.city) {
    const values = ctx.cityDbValues?.[f.city] ?? expandListingCityFilterValues(f.city);
    q = values.length === 1 ? q.eq("city", values[0]) : q.in("city", values);
  }
  if (f.region) {
    const values = f.region.split(REGION_VALUE_SEPARATOR).map((v) => v.trim()).filter(Boolean).slice(0, 20);
    if (values.length === 1) q = q.eq("region", values[0]);
    else if (values.length > 1) q = q.in("region", values);
  }
  if (f.kind) q = q.eq("kind", f.kind);
  if (f.minPrice) q = q.gte("price", Number(f.minPrice));
  if (f.maxPrice) q = q.lte("price", Number(f.maxPrice));

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
  gte(column: string, value: number): AdminListingQuery;
  lte(column: string, value: number): AdminListingQuery;
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
  if (filter.q) params.set("q", filter.q);
  if (filter.listingId) params.set("listingId", filter.listingId);
  if (filter.title) params.set("title", filter.title);
  if (filter.city) params.set("city", filter.city);
  if (filter.kind) params.set("kind", filter.kind);
  if (filter.propertyType) params.set("propertyType", filter.propertyType);
  if (filter.status) params.set("status", filter.status);
  if (filter.agent) params.set("agent", filter.agent);
  if (filter.region) params.set("region", filter.region);
  if (filter.minPrice) params.set("minPrice", filter.minPrice);
  if (filter.maxPrice) params.set("maxPrice", filter.maxPrice);
  return params;
}

export function displayListingPropertyType(stored: string): string {
  const { category, subtypeKey } = parseListingPropertyType(stored);
  const catLabel = LISTING_CATEGORY_LABEL_TR[category] || category;
  const subLabel = LISTING_SUBTYPE_LABEL_TR[subtypeKey];
  return subLabel ? `${catLabel} · ${subLabel}` : catLabel;
}

/** Ham şehir değeri → bağlı olduğu KKTC şehri (eşleşmezse null; filtrede yer almaz). */
function cityOptionKey(raw: string): string | null {
  return resolveListingParentCitySlug(raw);
}

export type DistinctListingCities = {
  /** Yalnızca KKTC'nin 6 büyük şehri, sabit sırayla. */
  options: string[];
  /** Seçenek → veritabanındaki ham değerler (filtre .in() ile hepsini yakalar). */
  dbValues: Record<string, string[]>;
};

/** Filtre açılırlarını besleyen ayrık değer taramaları (çöp kutusu hariç). */
export async function fetchDistinctListingCities(consultantAgentId?: string | null): Promise<DistinctListingCities> {
  const groups = new Map<string, Set<string>>();
  for await (const rows of iterateListingColumn<{ city: unknown }>("city", consultantAgentId)) {
    for (const row of rows) {
      const raw = typeof row.city === "string" ? row.city : "";
      if (!raw.trim()) continue;
      const key = cityOptionKey(raw);
      if (!key) continue;
      const set = groups.get(key) ?? new Set<string>();
      set.add(raw);
      groups.set(key, set);
    }
  }
  const options = kktcCities.map((c) => c.v).filter(Boolean);
  const dbValues: Record<string, string[]> = {};
  for (const k of options) {
    // İlanı olmayan şehir de listede kalır; filtre bilinen yazımlarla yine çalışır.
    dbValues[k] = groups.has(k) ? [...groups.get(k)!].sort() : expandListingCityFilterValues(k);
  }
  return { options, dbValues };
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

export type RegionOption = { value: string; label: string };

/** Bölge seçeneğinde aynı yerin farklı yazımları (ör. "alaykoy" / "Alayköy") bu ayraçla birleşir. */
export const REGION_VALUE_SEPARATOR = "|";

function regionFoldKey(raw: string): string {
  return displayListingRegionOrNeighborhood(raw)
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Şehir → bölge listesi (bölge açılır listesi şehre göre dolar).
 * Aynı bölgenin farklı yazımları tek seçenekte toplanır; seçenek değeri
 * veritabanındaki tüm ham değerleri taşır ki filtre hepsini yakalasın.
 */
export async function fetchDistinctListingRegionsByCity(
  consultantAgentId?: string | null,
): Promise<Record<string, RegionOption[]>> {
  const map = new Map<string, Map<string, Set<string>>>();
  for await (const rows of iterateListingColumn<{ city: unknown; region: unknown }>("city,region", consultantAgentId)) {
    for (const row of rows) {
      // Şehir seçenekleriyle aynı kanonik anahtar.
      const rawCity = typeof row.city === "string" ? row.city.trim() : "";
      const city = rawCity ? (cityOptionKey(rawCity) ?? "") : "";
      const region = typeof row.region === "string" ? row.region.trim() : "";
      if (!city || !region || region.includes(REGION_VALUE_SEPARATOR)) continue;
      const groups = map.get(city) ?? new Map<string, Set<string>>();
      const key = regionFoldKey(region);
      const set = groups.get(key) ?? new Set<string>();
      set.add(region);
      groups.set(key, set);
      map.set(city, groups);
    }
  }
  const out: Record<string, RegionOption[]> = {};
  for (const [city, groups] of map) {
    out[city] = [...groups.values()]
      .map((set) => {
        const raws = [...set].sort();
        const labels = raws.map(displayListingRegionOrNeighborhood);
        // Türkçe karakter içeren yazımı etiket olarak tercih et.
        const label = labels.find((l) => /[çğıöşüÇĞİÖŞÜ]/.test(l)) ?? labels[0];
        return { value: raws.join(REGION_VALUE_SEPARATOR), label };
      })
      .sort((x, y) => x.label.localeCompare(y.label, "tr"));
  }
  return out;
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
