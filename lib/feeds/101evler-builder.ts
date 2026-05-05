/**
 * 101evler XML Import feed builder.
 *
 * Bir Supabase listings satırını (listing_images JOIN'li) 101evler'in beklediği
 * <ad>...</ad> bloğuna dönüştürür ve toplam <ads> feed'ini üretir.
 */

import { normalizeListing } from "@/lib/listing-normalize";
import {
  AD_SPECS_FROM_FEATURES,
  CURRENCY_CODE_MAP,
} from "./101evler-constants";

function toStringArray(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.filter((x): x is string => typeof x === "string");
  }
  if (typeof input === "string" && input.trim()) {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === "string");
      }
    } catch {
      /* ignore */
    }
  }
  return [];
}

type Ext101evler = {
  type_id?: number | string | null;
  area_id?: number | string | null;
  title_type_id?: number | string | null;
  room_count_id?: number | string | null;
  build_age_id?: number | string | null;
  furnishing_id?: number | string | null;
  billing_cycle_id?: number | string | null;
  price_for?: "T" | "U" | null;
  reference_no?: string | null;
};

type FeedListingRow = Record<string, unknown> & {
  ext_101evler?: Ext101evler | string | null;
  type_id_101?: number | null;
  area_id_101?: number | null;
  title_type_id_101?: number | null;
  room_count_id_101?: number | null;
  build_age_id_101?: number | null;
  furnishing_id_101?: number | null;
  billing_cycle_id_101?: number | null;
  price_for_101?: string | null;
  reference_no_101?: string | null;
  listing_images?: Array<{ url: string; sort_order?: number; sortOrder?: number; is_primary?: boolean; isPrimary?: boolean }> | null;
  images?: Array<{ url: string; sort_order?: number; sortOrder?: number; is_primary?: boolean; isPrimary?: boolean }> | null;
};

type NormalizedFeedListing = {
  id?: string | number;
  listingId?: string | number;
  kind?: string | null;
  currency?: string | null;
  price?: string | number | null;
  updatedAt?: string | Date | null;
  createdAt?: string | Date | null;
  title?: string | null;
  longDescription?: string | null;
  shortDescription?: string | null;
  badgeNew?: boolean | null;
  bedrooms?: string | number | null;
  bathrooms?: string | number | null;
  floor?: string | number | null;
  areaM2?: string | number | null;
  plotAreaM2?: string | number | null;
  mapEnabled?: boolean | null;
  lat?: string | number | null;
  lng?: string | number | null;
  videoUrl?: string | null;
  virtualTourUrl?: string | null;
  hasPool?: boolean | null;
  hasGarden?: boolean | null;
  hasFireplace?: boolean | null;
  hasParking?: boolean | null;
  seaView?: boolean | null;
  furnished?: boolean | null;
  hasElevator?: boolean | null;
  hasBalcony?: boolean | null;
  hasTerrace?: boolean | null;
  hasAirConditioning?: boolean | null;
  hasGatedCommunity?: boolean | null;
};

export type RealtorIds = {
  first_realtor_id?: number | string | null;
  second_realtor_id?: number | string | null;
};

export type FeedBuildOptions = {
  siteUrl: string;       // örn: https://www.alfaemlak.com
  defaultLocale: string; // örn: "tr"
};

/* ────────── XML primitives ────────── */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function tag(name: string, value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value).trim();
  if (s === "") return "";
  return `<${name}>${escapeXml(s)}</${name}>`;
}

function rawTag(name: string, inner: string): string {
  return `<${name}>${inner}</${name}>`;
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

/* ────────── Eşleme yardımcıları ────────── */

function mapSaleOrRent(kind: string | null | undefined): "S" | "R" | null {
  if (!kind) return null;
  if (kind === "SATILIK" || kind === "PROJE") return "S";
  if (kind === "KIRALIK" || kind === "GUNLUK_KIRALIK") return "R";
  return null;
}

function mapCurrency(currency: string | null | undefined): number | null {
  if (!currency) return null;
  const code = CURRENCY_CODE_MAP[currency.toUpperCase()];
  return code ?? null;
}

function getTranslation(
  translations: unknown,
  lang: string,
  field: "title" | "shortDescription" | "longDescription",
): string {
  if (!translations) return "";
  let parsed: Record<string, Record<string, string>> | null = null;
  if (typeof translations === "string") {
    try {
      parsed = JSON.parse(translations);
    } catch {
      return "";
    }
  } else if (typeof translations === "object") {
    parsed = translations as Record<string, Record<string, string>>;
  }
  return parsed?.[lang]?.[field]?.trim() ?? "";
}

function buildAdSpecs(
  features: unknown,
  booleans: {
    hasPool?: boolean | null;
    hasGarden?: boolean | null;
    hasFireplace?: boolean | null;
    hasParking?: boolean | null;
    seaView?: boolean | null;
    furnished?: boolean | null;
    hasElevator?: boolean | null;
    hasBalcony?: boolean | null;
    hasTerrace?: boolean | null;
    hasAirConditioning?: boolean | null;
  },
): string {
  const set = new Map<string, boolean>();

  // Önce boolean kolonlar (öncelikli)
  if (booleans.hasPool) set.set("park", true);
  if (booleans.hasGarden) set.set("garden", true);
  if (booleans.hasFireplace) set.set("fireplace", true);
  if (booleans.hasParking) set.set("closed_park", true);
  if (booleans.seaView) set.set("sea_view", true);
  if (booleans.hasElevator) set.set("lift", true);
  if (booleans.hasBalcony) set.set("balcony", true);
  if (booleans.hasTerrace) set.set("terrace", true);
  if (booleans.hasAirConditioning) set.set("ac", true);

  // features (jsonb dizisi veya JSON string)
  const list = toStringArray(features);
  for (const raw of list) {
    const key = raw.trim().toLowerCase();
    const tagName = AD_SPECS_FROM_FEATURES[key];
    if (tagName) set.set(tagName, true);
  }

  if (!set.size) return "";
  const inner = Array.from(set.entries())
    .map(([t, v]) => `<${t}>${v ? "true" : "false"}</${t}>`)
    .join("");
  return rawTag("ad_specs", inner);
}

function buildAdPictures(
  images: Array<{ url: string; sort_order?: number; sortOrder?: number; is_primary?: boolean; isPrimary?: boolean }> | null | undefined,
): string {
  if (!images || images.length === 0) return "";
  const sorted = [...images].sort((a, b) => {
    const ap = a.is_primary ?? a.isPrimary ?? false;
    const bp = b.is_primary ?? b.isPrimary ?? false;
    if (ap !== bp) return ap ? -1 : 1;
    const ao = a.sort_order ?? a.sortOrder ?? 0;
    const bo = b.sort_order ?? b.sortOrder ?? 0;
    return ao - bo;
  });
  const inner = sorted
    .map((im, idx) => {
      const url = im.url?.trim();
      if (!url) return "";
      return rawTag(
        "ad_picture",
        tag("picture_url", url) + tag("order_by", idx + 1),
      );
    })
    .filter(Boolean)
    .join("");
  if (!inner) return "";
  return rawTag("ad_pictures", inner);
}

function parseExt101evler(input: FeedListingRow["ext_101evler"]): Ext101evler {
  if (!input) return {};
  if (typeof input === "string") {
    try {
      return JSON.parse(input) as Ext101evler;
    } catch {
      return {};
    }
  }
  return input;
}

/**
 * listings tablosundaki yeni `*_101` kolonlarını öncelikli alır,
 * eski `ext_101evler` JSONB değerlerini geri-uyumluluk için fallback olarak okur.
 */
function resolve101Mapping(row: FeedListingRow): Ext101evler {
  const fromJson = parseExt101evler(row.ext_101evler);
  const pick = <T,>(primary: T | null | undefined, fallback: T | null | undefined): T | null | undefined =>
    primary ?? fallback;

  return {
    type_id: pick(row.type_id_101 ?? null, fromJson.type_id ?? null),
    area_id: pick(row.area_id_101 ?? null, fromJson.area_id ?? null),
    title_type_id: pick(row.title_type_id_101 ?? null, fromJson.title_type_id ?? null),
    room_count_id: pick(row.room_count_id_101 ?? null, fromJson.room_count_id ?? null),
    build_age_id: pick(row.build_age_id_101 ?? null, fromJson.build_age_id ?? null),
    furnishing_id: pick(row.furnishing_id_101 ?? null, fromJson.furnishing_id ?? null),
    billing_cycle_id: pick(row.billing_cycle_id_101 ?? null, fromJson.billing_cycle_id ?? null),
    price_for: (pick(row.price_for_101 as "T" | "U" | null | undefined, fromJson.price_for ?? null) ?? null) as
      | "T"
      | "U"
      | null,
    reference_no: pick(row.reference_no_101 ?? null, fromJson.reference_no ?? null) ?? null,
  };
}

/* ────────── <ad> üretimi ────────── */

export type FeedSkipReason =
  | "missing_type_id"
  | "missing_area_id"
  | "missing_sale_or_rent"
  | "unsupported_currency"
  | "missing_price";

export type AdBuildResult =
  | { ok: true; xml: string }
  | { ok: false; reason: FeedSkipReason };

export function buildAdElement(
  rawListing: FeedListingRow,
  realtors: RealtorIds,
  opts: FeedBuildOptions,
): AdBuildResult {
  const normalized = normalizeListing(rawListing);
  if (!normalized) return { ok: false, reason: "missing_price" };
  const l = normalized as NormalizedFeedListing;
  const ext = resolve101Mapping(rawListing);

  if (ext.type_id === undefined || ext.type_id === null || ext.type_id === "") {
    return { ok: false, reason: "missing_type_id" };
  }
  if (ext.area_id === undefined || ext.area_id === null || ext.area_id === "") {
    return { ok: false, reason: "missing_area_id" };
  }

  const saleOrRent = mapSaleOrRent(l.kind);
  if (!saleOrRent) return { ok: false, reason: "missing_sale_or_rent" };

  const currencyCode = mapCurrency(l.currency);
  if (currencyCode === null) return { ok: false, reason: "unsupported_currency" };

  if (l.price === null || l.price === undefined || Number(l.price) <= 0) {
    return { ok: false, reason: "missing_price" };
  }

  const isNew = l.badgeNew ? "Y" : "N";

  const titleTr =
    getTranslation(rawListing.translations, "tr", "title") || l.title || "";
  const descTr =
    getTranslation(rawListing.translations, "tr", "longDescription") ||
    l.longDescription ||
    l.shortDescription ||
    "";

  const adUrl = `${opts.siteUrl.replace(/\/$/, "")}/${opts.defaultLocale}/ilan/${l.listingId}`;
  const adKey = rawListing.id ?? l.id ?? l.listingId;

  const parts: string[] = [
    tag("lastupdate", fmtDate(l.updatedAt ?? l.createdAt)),
    tag("type_id", ext.type_id),
    tag("first_realtor_id", realtors.first_realtor_id),
    tag("second_realtor_id", realtors.second_realtor_id),
    tag("area_id", ext.area_id),
    tag("reference_no", ext.reference_no || l.listingId),
    tag("title_type_id", ext.title_type_id),
    tag("sale_or_rent", saleOrRent),

    // Multi-language başlık & açıklama
    tag("ad_title_tr", titleTr),
    tag("ad_title_en", getTranslation(rawListing.translations, "en", "title")),
    tag("ad_title_ru", getTranslation(rawListing.translations, "ru", "title")),
    tag("ad_title_de", getTranslation(rawListing.translations, "de", "title")),
    tag("ad_title_fa", getTranslation(rawListing.translations, "fa", "title")),

    tag("ad_description_tr", descTr),
    tag(
      "ad_description_en",
      getTranslation(rawListing.translations, "en", "longDescription") ||
        getTranslation(rawListing.translations, "en", "shortDescription"),
    ),
    tag(
      "ad_description_ru",
      getTranslation(rawListing.translations, "ru", "longDescription") ||
        getTranslation(rawListing.translations, "ru", "shortDescription"),
    ),
    tag(
      "ad_description_de",
      getTranslation(rawListing.translations, "de", "longDescription") ||
        getTranslation(rawListing.translations, "de", "shortDescription"),
    ),
    tag(
      "ad_description_fa",
      getTranslation(rawListing.translations, "fa", "longDescription") ||
        getTranslation(rawListing.translations, "fa", "shortDescription"),
    ),

    tag("price", Math.round(Number(l.price))),
    tag("price_for", ext.price_for || "T"),
    tag("currency", currencyCode),

    saleOrRent === "R" ? tag("billing_cycle_id", ext.billing_cycle_id) : "",

    tag("room_count_id", ext.room_count_id),
    tag("is_new", isNew),
    tag("bedroom_count", l.bedrooms),
    tag("bathroom_count", l.bathrooms),
    tag("floor", l.floor),
    tag("total_area", l.areaM2),
    tag("build_age_id", ext.build_age_id),
    tag("furnishing_id", ext.furnishing_id),
    tag("house_land_space", l.plotAreaM2 ? `${l.plotAreaM2} sqm` : ""),

    tag("map_available", l.mapEnabled ? 1 : 0),
    tag("lat", l.lat),
    tag("lng", l.lng),

    tag("youtube", l.videoUrl),
    tag("t_360", l.virtualTourUrl),

    tag("ad_key", adKey),
    tag("url", adUrl),

    buildAdSpecs(rawListing.features, {
      hasPool: l.hasPool,
      hasGarden: l.hasGarden,
      hasFireplace: l.hasFireplace,
      hasParking: l.hasParking,
      seaView: l.seaView,
      furnished: l.furnished,
      hasElevator: l.hasElevator,
      hasBalcony: l.hasBalcony,
      hasTerrace: l.hasTerrace,
      hasAirConditioning: l.hasAirConditioning,
    }),

    buildAdPictures(rawListing.listing_images ?? rawListing.images ?? null),
  ];

  return { ok: true, xml: rawTag("ad", parts.filter(Boolean).join("")) };
}

/* ────────── Toplu feed üretimi ────────── */

export type FeedBuildSummary = {
  xml: string;
  total: number;
  included: number;
  skipped: { listingId: string; reason: FeedSkipReason }[];
};

export function buildFeedXml(
  listings: FeedListingRow[],
  realtors: RealtorIds,
  opts: FeedBuildOptions,
): FeedBuildSummary {
  const ads: string[] = [];
  const skipped: { listingId: string; reason: FeedSkipReason }[] = [];

  for (const row of listings) {
    const result = buildAdElement(row, realtors, opts);
    if (result.ok) {
      ads.push(result.xml);
    } else {
      skipped.push({
        listingId: String(row.listing_id ?? row.listingId ?? row.id ?? "?"),
        reason: result.reason,
      });
    }
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    rawTag("ads", ads.join(""));

  return { xml, total: listings.length, included: ads.length, skipped };
}
