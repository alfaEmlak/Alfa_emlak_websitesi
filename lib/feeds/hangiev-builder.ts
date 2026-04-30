/**
 * Hangiev XML feed builder.
 *
 * The final Hangiev XML contract is not available yet. This builder intentionally
 * keeps the provisional XML schema isolated so we can update tag names/mappings
 * later without changing the admin flow or database shape.
 */

import { normalizeListing } from "@/lib/listing-normalize";
import { HANGIEV_CURRENCY_CODE_MAP } from "./hangiev-constants";

type ExtHangiev = {
  property_type_id?: number | string | null;
  area_id?: number | string | null;
  room_count_id?: number | string | null;
  build_age_id?: number | string | null;
  furnishing_id?: number | string | null;
  price_for?: "T" | "U" | null;
  reference_no?: string | null;
};

type FeedListingRow = Record<string, unknown> & {
  ext_hangiev?: ExtHangiev | string | null;
  property_type_id_hg?: number | null;
  area_id_hg?: number | null;
  room_count_id_hg?: number | null;
  build_age_id_hg?: number | null;
  furnishing_id_hg?: number | null;
  price_for_hg?: string | null;
  reference_no_hg?: string | null;
  listing_images?: Array<{ url: string; sort_order?: number; sortOrder?: number }> | null;
  images?: Array<{ url: string; sort_order?: number; sortOrder?: number }> | null;
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
  bedrooms?: string | number | null;
  bathrooms?: string | number | null;
  floor?: string | number | null;
  areaM2?: string | number | null;
  plotAreaM2?: string | number | null;
  lat?: string | number | null;
  lng?: string | number | null;
  videoUrl?: string | null;
  virtualTourUrl?: string | null;
};

export type HangievAccount = {
  portal_id?: string | number | null;
  agent_id?: string | number | null;
  office_id?: string | number | null;
};

export type FeedBuildOptions = {
  siteUrl: string;
  defaultLocale: string;
};

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

function mapSaleOrRent(kind: string | null | undefined): "S" | "R" | null {
  if (!kind) return null;
  if (kind === "SATILIK" || kind === "PROJE") return "S";
  if (kind === "KIRALIK" || kind === "GUNLUK_KIRALIK") return "R";
  return null;
}

function mapCurrency(currency: string | null | undefined): string | null {
  if (!currency) return null;
  return HANGIEV_CURRENCY_CODE_MAP[currency.toUpperCase()] ?? null;
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

function buildPictures(
  images: Array<{ url: string; sort_order?: number; sortOrder?: number }> | null | undefined,
): string {
  if (!images || images.length === 0) return "";
  const inner = [...images]
    .sort((a, b) => (a.sort_order ?? a.sortOrder ?? 0) - (b.sort_order ?? b.sortOrder ?? 0))
    .map((image, idx) => {
      const url = image.url?.trim();
      if (!url) return "";
      return rawTag("picture", tag("url", url) + tag("order", idx + 1));
    })
    .filter(Boolean)
    .join("");
  return inner ? rawTag("pictures", inner) : "";
}

function parseExtHangiev(input: FeedListingRow["ext_hangiev"]): ExtHangiev {
  if (!input) return {};
  if (typeof input === "string") {
    try {
      return JSON.parse(input) as ExtHangiev;
    } catch {
      return {};
    }
  }
  return input;
}

function resolveHangievMapping(row: FeedListingRow): ExtHangiev {
  const fromJson = parseExtHangiev(row.ext_hangiev);
  const pick = <T,>(primary: T | null | undefined, fallback: T | null | undefined): T | null | undefined =>
    primary ?? fallback;

  return {
    property_type_id: pick(row.property_type_id_hg ?? null, fromJson.property_type_id ?? null),
    area_id: pick(row.area_id_hg ?? null, fromJson.area_id ?? null),
    room_count_id: pick(row.room_count_id_hg ?? null, fromJson.room_count_id ?? null),
    build_age_id: pick(row.build_age_id_hg ?? null, fromJson.build_age_id ?? null),
    furnishing_id: pick(row.furnishing_id_hg ?? null, fromJson.furnishing_id ?? null),
    price_for: (pick(row.price_for_hg as "T" | "U" | null | undefined, fromJson.price_for ?? null) ?? null) as
      | "T"
      | "U"
      | null,
    reference_no: pick(row.reference_no_hg ?? null, fromJson.reference_no ?? null) ?? null,
  };
}

export type FeedSkipReason =
  | "missing_property_type_id"
  | "missing_area_id"
  | "missing_sale_or_rent"
  | "unsupported_currency"
  | "missing_price";

export type AdBuildResult =
  | { ok: true; xml: string }
  | { ok: false; reason: FeedSkipReason };

export function buildListingElement(
  rawListing: FeedListingRow,
  account: HangievAccount,
  opts: FeedBuildOptions,
): AdBuildResult {
  const normalized = normalizeListing(rawListing);
  if (!normalized) return { ok: false, reason: "missing_price" };
  const l = normalized as NormalizedFeedListing;
  const ext = resolveHangievMapping(rawListing);

  if (ext.property_type_id === undefined || ext.property_type_id === null || ext.property_type_id === "") {
    return { ok: false, reason: "missing_property_type_id" };
  }
  if (ext.area_id === undefined || ext.area_id === null || ext.area_id === "") {
    return { ok: false, reason: "missing_area_id" };
  }

  const saleOrRent = mapSaleOrRent(l.kind);
  if (!saleOrRent) return { ok: false, reason: "missing_sale_or_rent" };

  const currency = mapCurrency(l.currency);
  if (!currency) return { ok: false, reason: "unsupported_currency" };

  if (l.price === null || l.price === undefined || Number(l.price) <= 0) {
    return { ok: false, reason: "missing_price" };
  }

  const titleTr = getTranslation(rawListing.translations, "tr", "title") || l.title || "";
  const descTr =
    getTranslation(rawListing.translations, "tr", "longDescription") ||
    l.longDescription ||
    l.shortDescription ||
    "";
  const detailUrl = `${opts.siteUrl.replace(/\/$/, "")}/${opts.defaultLocale}/ilan/${l.listingId}`;
  const externalKey = rawListing.id ?? l.id ?? l.listingId;

  const inner = [
    tag("external_key", externalKey),
    tag("last_update", fmtDate(l.updatedAt ?? l.createdAt)),
    tag("portal_id", account.portal_id),
    tag("agent_id", account.agent_id),
    tag("office_id", account.office_id),
    tag("reference_no", ext.reference_no || l.listingId),
    tag("property_type_id", ext.property_type_id),
    tag("area_id", ext.area_id),
    tag("sale_or_rent", saleOrRent),
    tag("title_tr", titleTr),
    tag("title_en", getTranslation(rawListing.translations, "en", "title")),
    tag("description_tr", descTr),
    tag(
      "description_en",
      getTranslation(rawListing.translations, "en", "longDescription") ||
        getTranslation(rawListing.translations, "en", "shortDescription"),
    ),
    tag("price", Math.round(Number(l.price))),
    tag("price_for", ext.price_for || "T"),
    tag("currency", currency),
    tag("room_count_id", ext.room_count_id),
    tag("bedroom_count", l.bedrooms),
    tag("bathroom_count", l.bathrooms),
    tag("floor", l.floor),
    tag("total_area", l.areaM2),
    tag("build_age_id", ext.build_age_id),
    tag("furnishing_id", ext.furnishing_id),
    tag("land_area", l.plotAreaM2),
    tag("lat", l.lat),
    tag("lng", l.lng),
    tag("video_url", l.videoUrl),
    tag("virtual_tour_url", l.virtualTourUrl),
    tag("url", detailUrl),
    buildPictures(rawListing.listing_images ?? rawListing.images ?? null),
  ].filter(Boolean).join("");

  return { ok: true, xml: rawTag("listing", inner) };
}

export type FeedBuildSummary = {
  xml: string;
  total: number;
  included: number;
  skipped: { listingId: string; reason: FeedSkipReason }[];
};

export function buildFeedXml(
  listings: FeedListingRow[],
  account: HangievAccount,
  opts: FeedBuildOptions,
): FeedBuildSummary {
  const items: string[] = [];
  const skipped: { listingId: string; reason: FeedSkipReason }[] = [];

  for (const row of listings) {
    const result = buildListingElement(row, account, opts);
    if (result.ok) {
      items.push(result.xml);
    } else {
      skipped.push({
        listingId: String(row.listing_id ?? row.listingId ?? row.id ?? "?"),
        reason: result.reason,
      });
    }
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    rawTag("listings", items.join(""));

  return { xml, total: listings.length, included: items.length, skipped };
}
