import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ListingKind } from "@/lib/listing-kinds";
import { normalizeListings } from "@/lib/listing-normalize";

export type ListingPublic = any;

function normalizeCity(raw: string | undefined) {
  if (!raw) return undefined;
  const m: Record<string, string> = {
    girne: "Girne",
    magusa: "Mağusa",
    lefkosa: "Lefkoşa",
    iskele: "İskele",
    lefke: "Lefke",
    guzelyurt: "Güzelyurt",
  };
  return m[raw.toLowerCase()] ?? raw;
}

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

  const sehir = normalizeCity(get("sehir"));
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

  const minRooms = get("minOda");
  if (minRooms) where.bedrooms = Number(minRooms);

  const emlak = get("emlak");
  if (emlak === "arsa") where.propertyType = "arsa";
  else if (emlak === "ticari") where.propertyType = "ticari";
  else if (emlak === "konut") where.propertyType = "konut";

  return { where, q };
}

export async function findPublishedListings(
  where: Record<string, any>,
  take = 12,
  skip = 0,
) {
  let query = supabaseAdmin
    .from("listings")
    .select("*, listing_images(*)")
    .eq("publish_status", "PUBLISHED")
    .order("created_at", { ascending: false })
    .range(skip, skip + take - 1);

  // Apply where filters
  if (where.kind) query = query.eq("kind", where.kind);
  if (where.city) query = query.eq("city", where.city);
  if (where.region) query = query.ilike("region", `%${where.region}%`);
  if (where.price) {
    if (where.price.gte) query = query.gte("price", where.price.gte);
    if (where.price.lte) query = query.lte("price", where.price.lte);
  }

  const { data } = await query;
  return normalizeListings(data || []);
}

export async function countPublished(where: Record<string, any>) {
  let query = supabaseAdmin
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("publish_status", "PUBLISHED");

  if (where.kind) query = query.eq("kind", where.kind);
  if (where.city) query = query.eq("city", where.city);

  const { count } = await query;
  return count || 0;
}

export async function getFeaturedListings(limit = 8) {
  const { data } = await supabaseAdmin
    .from("listings")
    .select("*, listing_images(*)")
    .eq("publish_status", "PUBLISHED")
    .filter("badges", "like", '%"featured":true%')
    .order("created_at", { ascending: false })
    .limit(limit);
  
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
): Promise<ListingPublic[]> {
  try {
    return await findPublishedListings(where, take, skip);
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

export async function getListingByPublicId(listingId: string, allowDraftForAdmin: boolean) {
  const { data: base } = await supabaseAdmin
    .from("listings")
    .select("*, listing_images(*)")
    .eq("listing_id", listingId)
    .single();
  
  if (!base) return null;
  if (base.publish_status !== "PUBLISHED" && !allowDraftForAdmin) return null;
  return normalizeListings([base])[0];
}

export async function getListingByPublicIdSafe(listingId: string, allowDraftForAdmin: boolean) {
  try {
    return await getListingByPublicId(listingId, allowDraftForAdmin);
  } catch (e) {
    console.error("[getListingByPublicIdSafe]", e);
    return null;
  }
}

export async function getSimilarListings(
  excludeId: string,
  city: string,
  kind: string,
  limit = 4,
) {
  const { data } = await supabaseAdmin
    .from("listings")
    .select("*, listing_images(*)")
    .eq("publish_status", "PUBLISHED")
    .neq("id", excludeId)
    .eq("city", city)
    .eq("kind", kind)
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
