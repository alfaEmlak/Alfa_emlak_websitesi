import { expandListingCityFilterValues, normalizeListingCitySlug } from "@/lib/listing-city";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ListingKind } from "@/lib/listing-kinds";
import { normalizeListings } from "@/lib/listing-normalize";
import { kktcRegions } from "@/lib/kktc-regions";
import type { PanelSessionData } from "@/lib/session";

/** Panel oturumu: yayında olmayan ilanı kimler görebilir (önizleme). */
export type UnpublishedListingAccess =
  | { mode: "none" }
  | { mode: "admin" }
  | { mode: "owner"; agentId: string };

export function unpublishedListingAccessFromSession(session: PanelSessionData | null | undefined): UnpublishedListingAccess {
  if (!session?.role) return { mode: "none" };
  if (session.role === "ADMIN") return { mode: "admin" };
  if (session.role === "CONSULTANT" && session.agentId) return { mode: "owner", agentId: session.agentId };
  return { mode: "none" };
}

export type ListingPublic = any;

export function buildListingFilters(sp: Record<string, string | string[] | undefined>) {
  const get = (k: string) => {
    const v = sp[k];
    if (Array.isArray(v)) return v[0];
    return v ?? undefined;
  };

  const where: Record<string, any> = {};

  const tur = get("tur");
  if (tur === "satilik") where.kind = "SATILIK";
  else if (tur === "kiralik") where.kind = "KIRALIK";
  else if (tur === "gunluk") where.kind = "GUNLUK_KIRALIK";
  else if (tur === "proje") where.kind = "PROJE";

  const sehir = get("sehir");
  if (sehir) where.city = sehir;

  const bolge = get("bolge");
  if (bolge && bolge !== "tum-kibris") {
    where.region = bolge;
  }

  const q = get("q");

  const priceFilter: Record<string, number> = {};
  const minPrice = get("minFiyat");
  const maxPrice = get("maxFiyat");
  if (minPrice) priceFilter.gte = Number(minPrice);
  if (maxPrice) priceFilter.lte = Number(maxPrice);
  if (Object.keys(priceFilter).length > 0) where.price = priceFilter;

  const m2Filter: Record<string, number> = {};
  const minM2 = get("minM2");
  const maxM2 = get("maxM2");
  if (minM2) m2Filter.gte = Number(minM2);
  if (maxM2) m2Filter.lte = Number(maxM2);
  if (Object.keys(m2Filter).length > 0) where.areaM2 = m2Filter;

  const isitma = get("isitma");
  if (isitma) {
    if (!where.featuresArr) where.featuresArr = [];
    where.featuresArr.push(isitma);
  }

  const esyali = get("esyali");
  if (esyali === "1" || esyali === "true") where.furnished = true;

  const ozellikler = get("ozellikler");
  if (ozellikler) {
    if (!where.featuresArr) where.featuresArr = [];
    where.featuresArr.push(...ozellikler.split(',').map(s => s.trim()).filter(Boolean));
  }

  // Oda: "0" = stüdyo, "3" / "3+1" = 3 yatak odası. Baştaki sayı yatak odası sayısıdır.
  const oda = get("oda");
  if (oda != null && oda !== "") {
    const n = parseInt(oda, 10);
    if (Number.isFinite(n)) where.bedrooms = n;
  }

  const emlak = get("emlak");
  if (emlak === "arsa") where.propertyType = "arsa";
  else if (emlak === "ticari") where.propertyType = "ticari";
  else if (emlak === "konut") where.propertyType = "konut";

  const danisman = get("danisman");
  if (danisman) where.createdByAgentId = danisman;

  // Feed (101evler) ilanları danışmana isimle bağlı olduğundan ada göre de eşleştirilebilir.
  const danismanAdi = get("danismanAdi");
  if (danismanAdi) where.createdByAgentName = danismanAdi;

  return { where, q };
}

function getRegionLabel(cityV: string, bolgeV: string) {
  const rs = kktcRegions[cityV] || [];
  return rs.find((r) => r.v === bolgeV)?.l || bolgeV;
}

function applyListingFilters(query: any, where: Record<string, any>) {
  if (where.kind) query = query.eq("kind", where.kind);
  if (where.propertyType) query = query.ilike("property_type", `%${where.propertyType}%`);
  if (where.bedrooms !== undefined) query = query.eq("bedrooms", where.bedrooms);
  
  if (where.city) {
    query = query.in("city", expandListingCityFilterValues(where.city));
  }

  if (where.region) {
    const cityKey = where.city ? normalizeListingCitySlug(where.city) || where.city : "";
    const l = cityKey ? getRegionLabel(cityKey, where.region) : where.region;
    query = query.in("region", Array.from(new Set([where.region, l])));
  }
  
  if (where.price) {
    if (where.price.gte) query = query.gte("price", where.price.gte);
    if (where.price.lte) query = query.lte("price", where.price.lte);
  }

  if (where.areaM2) {
    if (where.areaM2.gte) query = query.gte("area_m2", where.areaM2.gte);
    if (where.areaM2.lte) query = query.lte("area_m2", where.areaM2.lte);
  }

  if (where.furnished !== undefined) {
    query = query.eq("furnished", where.furnished);
  }

  if (where.createdByAgentId && where.createdByAgentName) {
    const nameEsc = String(where.createdByAgentName).replace(/"/g, '\\"');
    query = query.or(`created_by_agent_id.eq.${where.createdByAgentId},created_by_name.eq."${nameEsc}"`);
  } else if (where.createdByAgentId) {
    query = query.eq("created_by_agent_id", where.createdByAgentId);
  } else if (where.createdByAgentName) {
    query = query.eq("created_by_name", where.createdByAgentName);
  }

  if (where.featuresArr && where.featuresArr.length > 0) {
    where.featuresArr.forEach((feat: string) => {
      query = query.ilike("features", `%${feat}%`);
    });
  }

  return query;
}

function orderColumnForSort(sort?: string): { column: string; ascending: boolean } {
  switch (sort) {
    case "ucuz":
      return { column: "price", ascending: true };
    case "pahali":
      return { column: "price", ascending: false };
    case "eski":
      return { column: "created_at", ascending: true };
    case "yeni":
    default:
      return { column: "created_at", ascending: false };
  }
}

export async function findPublishedListings(
  where: Record<string, any>,
  take = 12,
  skip = 0,
  sort?: string,
) {
  const ord = orderColumnForSort(sort);
  let query = supabaseAdmin
    .from("listings")
    .select("*, listing_images(*)")
    .eq("publish_status", "PUBLISHED")
    .order(ord.column, { ascending: ord.ascending })
    .range(skip, skip + take - 1);

  query = applyListingFilters(query, where);

  const { data } = await query;
  return normalizeListings(data || []);
}

export async function countPublished(where: Record<string, any>) {
  let query = supabaseAdmin
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("publish_status", "PUBLISHED");

  query = applyListingFilters(query, where);

  const { count } = await query;
  return count || 0;
}

export async function getFeaturedListings(limit = 8) {
  // Try JSONB containment first, fall back to text LIKE for string columns
  const { data, error } = await supabaseAdmin
    .from("listings")
    .select("*, listing_images(*)")
    .eq("publish_status", "PUBLISHED")
    .contains("badges", { featured: true })
    .order("created_at", { ascending: false })
    .limit(limit);

  // If JSONB containment fails (badges stored as text), try LIKE fallback
  if (error || !data) {
    const { data: fallback } = await supabaseAdmin
      .from("listings")
      .select("*, listing_images(*)")
      .eq("publish_status", "PUBLISHED")
      .like("badges", '%"featured":true%')
      .order("created_at", { ascending: false })
      .limit(limit);
    return normalizeListings(fallback || []);
  }
  
  return normalizeListings(data || []);
}

/** DB kapalı / yol hatalı / sunucusuz ortamda ana sayfa 500 vermesin. */
export async function getFeaturedListingsSafe(limit = 8): Promise<ListingPublic[]> {
  try {
    return await getFeaturedListings(limit);
  } catch (e) {
    console.error("[getFeaturedListingsSafe]", e);
    return [];
  }
}

export async function findPublishedListingsSafe(
  where: Record<string, any>,
  take = 12,
  skip = 0,
  sort?: string,
): Promise<ListingPublic[]> {
  try {
    return await findPublishedListings(where, take, skip, sort);
  } catch (e) {
    console.error("[findPublishedListingsSafe]", e);
    return [];
  }
}

export async function countPublishedSafe(where: Record<string, any>): Promise<number> {
  try {
    return await countPublished(where);
  } catch (e) {
    console.error("[countPublishedSafe]", e);
    return 0;
  }
}

export async function getLatestByKind(kind: ListingKind, limit = 4) {
  const { data } = await supabaseAdmin
    .from("listings")
    .select("*, listing_images(*)")
    .eq("publish_status", "PUBLISHED")
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(limit);
  
  return normalizeListings(data || []);
}

export async function getListingByPublicId(listingId: string, access: UnpublishedListingAccess) {
  const { data: base } = await supabaseAdmin
    .from("listings")
    .select("*, listing_images(*)")
    .eq("listing_id", listingId)
    .single();

  if (!base) return null;
  if (base.publish_status === "PUBLISHED") return normalizeListings([base])[0];
  if (access.mode === "none") return null;
  if (access.mode === "admin") return normalizeListings([base])[0];
  if (access.mode === "owner" && base.created_by_agent_id === access.agentId) return normalizeListings([base])[0];
  return null;
}

export async function getListingByPublicIdSafe(listingId: string, access: UnpublishedListingAccess) {
  try {
    return await getListingByPublicId(listingId, access);
  } catch (e) {
    console.error("[getListingByPublicIdSafe]", e);
    return null;
  }
}

/**
 * Yayında ilan detayı her görüntülendiğinde Supabase `listings.views` sayacını artırır.
 * (İstatistik paneli bu alanı okur; Prisma/SQLite ile senkron tutulmaz.)
 */
export async function incrementListingViewsSupabase(listingUuid: string): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin
      .from("listings")
      .select("views")
      .eq("id", listingUuid)
      .maybeSingle();
    if (error || data == null) return;
    const cur =
      typeof data.views === "number" && Number.isFinite(data.views)
        ? data.views
        : Number.parseInt(String(data.views ?? "0"), 10) || 0;
    await supabaseAdmin.from("listings").update({ views: cur + 1 }).eq("id", listingUuid);
  } catch {
    /* ignore */
  }
}

export async function getSimilarListings(
  excludeId: string,
  city: string,
  kind: string,
  limit = 4,
) {
  let query = supabaseAdmin
    .from("listings")
    .select("*, listing_images(*)")
    .eq("publish_status", "PUBLISHED")
    .neq("id", excludeId)
    .eq("kind", kind);

  if (city) {
    query = query.in("city", expandListingCityFilterValues(city));
  }

  const { data } = await query
    .order("created_at", { ascending: false })
    .limit(limit);
  
  return normalizeListings(data || []);
}

export async function getSimilarListingsSafe(
  excludeId: string,
  city: string,
  kind: string,
  limit = 4,
): Promise<ListingPublic[]> {
  try {
    return await getSimilarListings(excludeId, city, kind, limit);
  } catch (e) {
    console.error("[getSimilarListingsSafe]", e);
    return [];
  }
}
