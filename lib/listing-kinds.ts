export const LISTING_KINDS = [
  "SATILIK",
  "KIRALIK",
  "GUNLUK_KIRALIK",
  "PROJE",
] as const;

export type ListingKind = (typeof LISTING_KINDS)[number];

export const PUBLISH_STATUSES = ["DRAFT", "PUBLISHED", "HIDDEN"] as const;

export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

/**
 * Returns the translation key for listing kind.
 * Usage: tc(`listingKinds.${listing.kind}`)
 */
export function getListingKindKey(k: string): string {
  return `listingKinds.${k}`;
}

/**
 * Returns the translation key for publish status.
 * Usage: tw(`status.${status.toLowerCase()}`)
 */
export function getPublishStatusKey(s: string): string {
  return `status.${s.toLowerCase()}`;
}

export function listingKindLabel(k: string): string {
  switch (k) {
    case "SATILIK":
      return "Satılık";
    case "KIRALIK":
      return "Kiralık";
    case "GUNLUK_KIRALIK":
      return "Günlük Kiralık";
    case "PROJE":
      return "Proje";
    default:
      return k;
  }
}

export function publishStatusLabel(s: string): string {
  switch (s) {
    case "DRAFT":
      return "Taslak";
    case "PUBLISHED":
      return "Yayında";
    case "HIDDEN":
      return "Gizli";
    default:
      return s;
  }
}
