import { expandListingCityFilterValues, normalizeListingCitySlug } from "@/lib/listing-city";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LISTING_SUBTYPE_LABEL_TR } from "@/lib/listing-property-taxonomy";
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

  // Bölge çoklu seçilebilir: "bolge=girne-merkez,alsancak".
  // Tek değer de çalışır (eski bağlantılar, default-menu.ts vb. bozulmaz).
  const bolge = get("bolge");
  if (bolge) {
    const regions = bolge
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && s !== "tum-kibris");
    if (regions.length > 0) where.regions = Array.from(new Set(regions));
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

  // Oda: "1+0", "2+1", "3+1" vb. tam oda tipi stringi. Baştaki sayı yatak odası, arkası oturma odası.
  const oda = get("oda");
  if (oda != null && oda !== "") {
    if (oda.includes("+")) {
      const parts = oda.split("+");
      const beds = parseInt(parts[0], 10);
      const living = parseInt(parts[1], 10);
      if (Number.isFinite(beds)) where.bedrooms = beds;
      if (Number.isFinite(living)) where.livingRooms = living;
    } else {
      // Geriye dönük uyumluluk: sadece sayı verilirse sadece bedrooms filtresi
      const n = parseInt(oda, 10);
      if (Number.isFinite(n)) where.bedrooms = n;
    }
  }

  const emlak = get("emlak");
  if (emlak === "arsa") where.propertyType = "arsa";
  else if (emlak === "ticari") where.propertyType = "ticari";
  else if (emlak === "konut") where.propertyType = "konut";

  const altTip = get("altTip");
  if (altTip) {
    where.propertySubtype = altTip;
  }

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
  if (where.propertySubtype) {
    const subtypeLabel = LISTING_SUBTYPE_LABEL_TR[where.propertySubtype] || where.propertySubtype;
    query = query.ilike("property_type", `%${subtypeLabel}%`);
  }
  if (where.bedrooms !== undefined) query = query.eq("bedrooms", where.bedrooms);
  
  if (where.city) {
    query = query.in("city", expandListingCityFilterValues(where.city));
  }

  if (where.regions?.length) {
    // DB'de bölge kimi kayıtta slug ("alsancak"), kimide etiket ("Alsancak")
    // tutulduğu için her seçim iki biçimiyle birden aranır.
    const cityKey = where.city ? normalizeListingCitySlug(where.city) || where.city : "";
    const values = new Set<string>();
    for (const r of where.regions as string[]) {
      values.add(r);
      values.add(cityKey ? getRegionLabel(cityKey, r) : r);
    }
    query = query.in("region", Array.from(values));
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
    .is("deleted_at", null)
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
  propertyType?: string,
  region?: string,
  limit = 4,
) {
  let category = "";
  if (propertyType && typeof propertyType === "string") {
    const s = propertyType.trim();
    if (s.includes(" \u00b7 ")) {
      category = s.split(" \u00b7 ")[0].trim().toLowerCase();
    } else {
      category = s.toLowerCase();
    }
  }

  const results: any[] = [];
  const seenIds = new Set<string>([excludeId]);

  // Phase 1: Same kind AND same property_type category AND same region AND same city
  if (category && region && typeof region === "string" && city && typeof city === "string") {
    const { data } = await supabaseAdmin
      .from("listings")
      .select("*, listing_images(*)")
      .eq("publish_status", "PUBLISHED")
      .neq("id", excludeId)
      .eq("kind", kind)
      .eq("region", region)
      .in("city", expandListingCityFilterValues(city))
      .ilike("property_type", `${category}%`)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data) {
      for (const row of data) {
        if (!seenIds.has(row.id)) {
          results.push(row);
          seenIds.add(row.id);
        }
      }
    }
  }

  // Phase 2: Same kind AND same property_type category AND same city
  if (results.length < limit && category && city && typeof city === "string") {
    const { data } = await supabaseAdmin
      .from("listings")
      .select("*, listing_images(*)")
      .eq("publish_status", "PUBLISHED")
      .neq("id", excludeId)
      .eq("kind", kind)
      .in("city", expandListingCityFilterValues(city))
      .ilike("property_type", `${category}%`)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data) {
      for (const row of data) {
        if (!seenIds.has(row.id)) {
          results.push(row);
          seenIds.add(row.id);
        }
      }
    }
  }

  // Phase 3: Same kind AND same city (original fallback)
  if (results.length < limit && city && typeof city === "string") {
    const { data } = await supabaseAdmin
      .from("listings")
      .select("*, listing_images(*)")
      .eq("publish_status", "PUBLISHED")
      .neq("id", excludeId)
      .eq("kind", kind)
      .in("city", expandListingCityFilterValues(city))
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data) {
      for (const row of data) {
        if (!seenIds.has(row.id)) {
          results.push(row);
          seenIds.add(row.id);
        }
      }
    }
  }

  // Phase 4: Just same kind
  if (results.length < limit) {
    const { data } = await supabaseAdmin
      .from("listings")
      .select("*, listing_images(*)")
      .eq("publish_status", "PUBLISHED")
      .neq("id", excludeId)
      .eq("kind", kind)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data) {
      for (const row of data) {
        if (!seenIds.has(row.id)) {
          results.push(row);
          seenIds.add(row.id);
        }
      }
    }
  }

  return normalizeListings(results.slice(0, limit));
}

export async function getSimilarListingsSafe(
  excludeId: string,
  city: string,
  kind: string,
  propertyType?: string,
  region?: string,
  limit = 4,
): Promise<ListingPublic[]> {
  try {
    return await getSimilarListings(excludeId, city, kind, propertyType, region, limit);
  } catch (e) {
    console.error("[getSimilarListingsSafe]", e);
    return [];
  }
}

/** Aynı danışmanın diğer yayındaki ilanları (önce agentId, sonra danışman adı/telefonu ile eşle). */
export async function getListingsByConsultantSafe(
  excludeId: string,
  opts: { agentId?: string | null; consultantName?: string | null; consultantPhone?: string | null },
  limit = 4,
): Promise<ListingPublic[]> {
  try {
    const seen = new Set<string>([excludeId]);
    const out: any[] = [];
    const pull = (data: any[] | null) => {
      if (!data) return;
      for (const row of data) {
        if (!seen.has(row.id)) {
          out.push(row);
          seen.add(row.id);
        }
      }
    };
    const base = () =>
      supabaseAdmin
        .from("listings")
        .select("*, listing_images(*)")
        .eq("publish_status", "PUBLISHED")
        .neq("id", excludeId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (opts.agentId) {
      const { data } = await base().eq("created_by_agent_id", opts.agentId);
      pull(data);
    }
    if (out.length < limit && opts.consultantName) {
      const { data } = await base().eq("consultant_name", opts.consultantName);
      pull(data);
    }
    if (out.length < limit && opts.consultantPhone) {
      const { data } = await base().eq("consultant_phone", opts.consultantPhone);
      pull(data);
    }
    return normalizeListings(out.slice(0, limit));
  } catch (e) {
    console.error("[getListingsByConsultantSafe]", e);
    return [];
  }
}
