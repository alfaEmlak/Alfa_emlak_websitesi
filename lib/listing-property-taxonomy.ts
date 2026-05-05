/**
 * Single source of truth for listing property category + subtype keys
 * (aligned with HeroSearch / messages HeroSearch.subTypes.*).
 *
 * Stored `property_type` uses `category + SEP + Turkish subtype label` when a subtype
 * is chosen so ilanlar filters (`%konut%`, `%arsa%`, …) still match.
 */

export const LISTING_PROPERTY_TYPE_SEPARATOR = " \u00b7 ";

export const LISTING_CATEGORY_KEYS = ["konut", "arsa", "ticari", "proje"] as const;
export type ListingCategoryKey = (typeof LISTING_CATEGORY_KEYS)[number];

export const LISTING_SUBTYPE_MAP: Record<ListingCategoryKey, readonly string[]> = {
  konut: [
    "villa",
    "daire",
    "ikizVilla",
    "penthouse",
    "residence",
    "bungalow",
    "mustakilEv",
    "kompleBina",
    "devremulk",
    "metrukBina",
    "yarimInsaat",
  ],
  arsa: ["konutImarli", "ticariImarli", "tarla", "bagBahce", "sanayiArsasi"],
  ticari: ["ofis", "dukkan", "magaza", "otel", "restoran", "depo", "fabrika"],
  proje: ["devamEden", "tamamlanmis"],
};

/** Turkish labels — keep in sync with messages/tr.json HeroSearch.subTypes */
export const LISTING_SUBTYPE_LABEL_TR: Record<string, string> = {
  villa: "Villa",
  daire: "Daire",
  ikizVilla: "İkiz Villa",
  penthouse: "Penthouse",
  residence: "Residence",
  bungalow: "Bungalow",
  mustakilEv: "Müstakil Ev",
  kompleBina: "Komple Bina",
  devremulk: "Devremülk",
  metrukBina: "Metruk Bina",
  yarimInsaat: "Yarım İnşaat",
  konutImarli: "Konut İmarlı",
  ticariImarli: "Ticari İmarlı",
  tarla: "Tarla",
  bagBahce: "Bağ & Bahçe",
  sanayiArsasi: "Sanayi Arsası",
  ofis: "Ofis",
  dukkan: "Dükkân",
  magaza: "Mağaza",
  otel: "Otel",
  restoran: "Restoran",
  depo: "Depo",
  fabrika: "Fabrika",
  devamEden: "Devam Eden Projeler",
  tamamlanmis: "Tamamlanmış Projeler",
};

export const LISTING_CATEGORY_LABEL_TR: Record<ListingCategoryKey, string> = {
  konut: "Konut",
  arsa: "Arsa",
  ticari: "Ticari",
  proje: "Proje",
};

function normalizeTaxonomyText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]/g, "");
}

export function isListingCategoryKey(v: string): v is ListingCategoryKey {
  return (LISTING_CATEGORY_KEYS as readonly string[]).includes(v);
}

export function formatListingPropertyType(category: ListingCategoryKey, subtypeKey: string): string {
  if (subtypeKey && LISTING_SUBTYPE_MAP[category].includes(subtypeKey)) {
    const label = LISTING_SUBTYPE_LABEL_TR[subtypeKey];
    if (label) return `${category}${LISTING_PROPERTY_TYPE_SEPARATOR}${label}`;
  }
  return category;
}

function subtypeKeyFromLabel(category: ListingCategoryKey, label: string): string {
  const norm = normalizeTaxonomyText(label);
  for (const sub of LISTING_SUBTYPE_MAP[category]) {
    const tr = LISTING_SUBTYPE_LABEL_TR[sub];
    if (tr && normalizeTaxonomyText(tr) === norm) return sub;
  }
  return "";
}

/** Human-readable heading (detail page): subtype label, or category TR, or raw. */
export function listingPropertyTypeDisplayLabel(stored: string): string {
  const s = stored.trim();
  if (!s) return "";
  if (s.includes(LISTING_PROPERTY_TYPE_SEPARATOR)) {
    return s.split(LISTING_PROPERTY_TYPE_SEPARATOR).slice(1).join(LISTING_PROPERTY_TYPE_SEPARATOR).trim();
  }
  const lower = s.toLocaleLowerCase("tr-TR");
  if (isListingCategoryKey(lower)) return LISTING_CATEGORY_LABEL_TR[lower];
  return s;
}

/**
 * Map stored DB value → 101/Hangiev lookup label (subtype TR, or category defaults).
 */
export function propertyTypeForFeedLookup(stored: string): string {
  const s = stored.trim();
  if (!s) return "";
  if (s.includes(LISTING_PROPERTY_TYPE_SEPARATOR)) {
    return s.split(LISTING_PROPERTY_TYPE_SEPARATOR).slice(1).join(LISTING_PROPERTY_TYPE_SEPARATOR).trim();
  }
  const key = s.toLocaleLowerCase("tr-TR");
  if (key === "arsa") return "Arsa";
  if (key === "ticari") return "İş Yeri";
  if (key === "konut") return "Daire";
  if (key === "proje") return "Proje";
  return s;
}

export function parseListingPropertyType(raw: string | null | undefined): {
  category: ListingCategoryKey;
  subtypeKey: string;
} {
  const s = (raw ?? "").trim();
  if (!s) return { category: "konut", subtypeKey: "daire" };

  if (s.includes(LISTING_PROPERTY_TYPE_SEPARATOR)) {
    const [catRaw, ...rest] = s.split(LISTING_PROPERTY_TYPE_SEPARATOR);
    const cat = catRaw.trim().toLowerCase();
    const labelPart = rest.join(LISTING_PROPERTY_TYPE_SEPARATOR).trim();
    if (isListingCategoryKey(cat)) {
      const sk = subtypeKeyFromLabel(cat, labelPart);
      return { category: cat, subtypeKey: sk };
    }
  }

  const lower = s.toLocaleLowerCase("tr-TR");
  if (isListingCategoryKey(lower)) return { category: lower, subtypeKey: "" };

  for (const cat of LISTING_CATEGORY_KEYS) {
    const sk = subtypeKeyFromLabel(cat, s);
    if (sk) return { category: cat, subtypeKey: sk };
  }

  return { category: "konut", subtypeKey: "" };
}
