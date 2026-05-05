import { displayListingCity } from "@/lib/listing-city";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ListingForAssistant, ListingSearchParams } from "@/lib/ai/types";

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ı]/g, "i")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAreaFromText(value: string) {
  const normalized = normalizeText(value);
  const match = normalized.match(/(\d{2,6})\s*m2/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCurrency(value: unknown) {
  if (typeof value !== "string") return "";
  const raw = value.trim().toLocaleLowerCase("tr-TR");
  const normalized = normalizeText(value);
  if (raw.includes("£") || normalized.includes("sterlin") || normalized.includes("pound") || normalized.includes("gbp")) return "gbp";
  if (normalized.includes("try") || normalized.includes("tl") || raw.includes("₺")) return "try";
  if (normalized.includes("eur") || normalized.includes("euro") || raw.includes("€")) return "eur";
  if (normalized.includes("usd") || normalized.includes("dolar") || raw.includes("$")) return "usd";
  return normalized;
}

function mapIntentToKind(intent: ListingSearchParams["intent"]) {
  if (intent === "buy") return "SATILIK";
  if (intent === "rent") return "KIRALIK";
  return null;
}

function mapPropertyType(value: string | null | undefined) {
  if (!value) return null;
  const v = normalizeText(value);
  if (v.includes("arsa") || v.includes("land")) return "arsa";
  if (v.includes("villa")) return "villa";
  if (v.includes("daire") || v.includes("ev") || v.includes("konut")) return "konut";
  if (v.includes("ticari") || v.includes("ofis") || v.includes("dukkan")) return "ticari";
  return v;
}

function extractRooms(row: Record<string, unknown>) {
  const bedrooms = typeof row.bedrooms === "number" ? row.bedrooms : Number(row.bedrooms || 0);
  const livingRooms = typeof row.living_rooms === "number" ? row.living_rooms : Number(row.living_rooms || 0);
  if (bedrooms > 0 || livingRooms > 0) return `${bedrooms || 0}+${livingRooms || 1}`;
  return null;
}

function rowToListing(row: Record<string, unknown>, locale: string): ListingForAssistant {
  const images = Array.isArray(row.listing_images) ? row.listing_images : [];
  const primary = images.find((img) => typeof img === "object" && img && (img as { is_primary?: boolean }).is_primary);
  const first = images[0] as { url?: string } | undefined;
  const listingId = String(row.listing_id || "");
  return {
    listingId,
    title: String(row.title || ""),
    city: displayListingCity(String(row.city || "")),
    region: String(row.region || ""),
    neighborhood: String(row.neighborhood || ""),
    kind: String(row.kind || ""),
    propertyType: String(row.property_type || ""),
    price: row.price == null ? null : Number(row.price),
    currency: String(row.currency || "TRY"),
    rooms: extractRooms(row),
    bedrooms: row.bedrooms == null ? null : Number(row.bedrooms),
    bathrooms: row.bathrooms == null ? null : Number(row.bathrooms),
    areaM2: row.area_m2 == null ? null : Number(row.area_m2),
    image: typeof row.cover_image === "string" && row.cover_image ? row.cover_image : primary?.url || first?.url || null,
    detailUrl: `/${locale}/ilan/${encodeURIComponent(listingId)}`,
  };
}

export async function searchListingsForAssistant(params: ListingSearchParams, locale: string) {
  const limit = Math.max(1, Math.min(params.limit ?? 5, 10));
  const { data, error } = await supabaseAdmin
    .from("listings")
    .select("listing_id,title,description_tr,city,region,neighborhood,kind,property_type,price,currency,bedrooms,bathrooms,living_rooms,area_m2,cover_image,listing_images(url,is_primary,sort_order),publish_status,created_at")
    .eq("publish_status", "PUBLISHED")
    .order("created_at", { ascending: false })
    .limit(400);
  if (error) throw new Error(error.message);

  const targetKind = mapIntentToKind(params.intent);
  const targetPropertyType = mapPropertyType(params.propertyType || null);
  const targetCurrency = normalizeCurrency(params.currency);
  const minPrice = typeof params.budgetMin === "number" ? params.budgetMin : null;
  const maxPrice = typeof params.budgetMax === "number" ? params.budgetMax : null;
  const minSquareMeters = typeof params.minSquareMeters === "number" ? params.minSquareMeters : null;
  const featureTokens = (params.features || []).map(normalizeText).filter(Boolean);
  const locationTokens = [params.city, params.district, params.neighborhood, params.query]
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .flatMap((x) => normalizeText(x).split(" "))
    .filter((x) => x.length >= 3);
  const roomToken = params.rooms ? normalizeText(params.rooms) : "";

  const listings = (data || [])
    .map((row) => ({ row, listing: rowToListing(row, locale) }))
    .filter(({ row, listing }) => {
      const searchable = normalizeText(
        [row.title, row.description_tr, row.city, row.region, row.neighborhood, row.property_type].filter(Boolean).join(" "),
      );
      const listingCurrency = normalizeCurrency(listing.currency);
      const listingAreaRaw = listing.areaM2 ?? 0;
      const listingAreaFromText = parseAreaFromText([String(row.title || ""), String(row.description_tr || "")].join(" "));
      const listingArea = listingAreaRaw > 0 ? listingAreaRaw : (listingAreaFromText ?? 0);

      if (targetKind && listing.kind !== targetKind) return false;
      if (targetPropertyType && !normalizeText(listing.propertyType).includes(targetPropertyType)) return false;
      if (minPrice != null && listing.price != null && listing.price < minPrice) return false;
      if (maxPrice != null && listing.price != null && listing.price > maxPrice) return false;
      if (targetCurrency && listingCurrency && listingCurrency !== targetCurrency) return false;
      if (minSquareMeters != null && listingArea > 0 && listingArea < minSquareMeters) return false;
      if (roomToken && listing.rooms && !normalizeText(listing.rooms).includes(roomToken)) return false;
      if (locationTokens.length > 0 && !locationTokens.some((token) => searchable.includes(token))) return false;
      if (featureTokens.length > 0 && !featureTokens.every((token) => searchable.includes(token))) return false;
      return true;
    })
    .map((x) => x.listing);

  return listings.slice(0, limit);
}

export async function getListingForAssistant(listingId: string, locale: string) {
  const { data, error } = await supabaseAdmin
    .from("listings")
    .select("listing_id,title,description_tr,city,region,neighborhood,kind,property_type,price,currency,bedrooms,bathrooms,living_rooms,area_m2,cover_image,listing_images(url,is_primary,sort_order),publish_status")
    .eq("publish_status", "PUBLISHED")
    .eq("listing_id", listingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToListing(data, locale);
}
