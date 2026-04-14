import type { Listing, ListingImage } from "@prisma/client";

export type DetailFieldEntry = { value: string; visible: boolean };
export type DetailFieldsMap = Record<string, DetailFieldEntry>;

export const DETAIL_FIELD_LABELS: Record<string, string> = {
  salesPrice: "Satış Fiyatı",
  listingNo: "İlan Numarası",
  statusText: "Durumu",
  housingType: "Konut Tipi",
  agencyRef: "Acente Referansı",
  pricePerM2: "Fiyat / Metrekare",
  totalPlot: "Toplam Arsa / Arazi Alanı",
  interiorArea: "Kullanılabilir İç Alan",
  floor: "Kat",
  buildingAge: "Bina Yaşı",
  pool: "Havuz",
  garden: "Bahçe",
  fireplace: "Şömine",
  livingRoom: "Oturma Odası",
};

export function parseDetailFields(raw: string | null | undefined): DetailFieldsMap {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as DetailFieldsMap;
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

export function parseStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const o = JSON.parse(raw) as unknown;
    return Array.isArray(o) ? o.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export type NearbyRow = { name: string; distance: string };

export function parseNearby(raw: string | null | undefined): NearbyRow[] {
  if (!raw) return [];
  try {
    const o = JSON.parse(raw) as unknown;
    if (!Array.isArray(o)) return [];
    return o
      .filter((r): r is NearbyRow => !!r && typeof r.name === "string" && typeof r.distance === "string")
      .map((r) => ({ name: r.name, distance: r.distance }));
  } catch {
    return [];
  }
}

/** Tek satır "enlem,boylam" (boşluk toleranslı). Boş string → { lat: "", lng: "" }; geçersiz → null. */
export function parseLatLngPair(raw: string): { lat: string; lng: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return { lat: "", lng: "" };
  const parts = trimmed.split(",").map((p) => p.trim());
  if (parts.length !== 2) return null;
  const [lat, lng] = parts;
  const num = /^-?\d+(\.\d+)?$/;
  if (!num.test(lat) || !num.test(lng)) return null;
  return { lat, lng };
}

export function visibleDetailRows(raw: string | null | undefined) {
  const fields = parseDetailFields(raw);
  return Object.entries(fields)
    .filter(([, v]) => v.visible && String(v.value ?? "").trim() !== "")
    .map(([key, v]) => ({
      key,
      label: DETAIL_FIELD_LABELS[key] ?? key,
      value: v.value,
    }));
}

export type ListingWithImages = Listing & { images: ListingImage[] };

export function sortImages(listing: any) {
  const imgs = listing.images ?? listing.listing_images ?? [];
  if (!Array.isArray(imgs)) return [];
  return [...imgs].sort((a: any, b: any) => {
    const aOrder = a.sortOrder ?? a.sort_order ?? 0;
    const bOrder = b.sortOrder ?? b.sort_order ?? 0;
    return aOrder - bOrder || (a.url ?? "").localeCompare(b.url ?? "");
  });
}

export function primaryImageUrl(listing: any) {
  const cover = listing.coverImage ?? listing.cover_image;
  if (cover && typeof cover === "string" && cover.trim()) return cover.trim();
  const sorted = sortImages(listing);
  const primary = sorted.find((i: any) => i.isPrimary ?? i.is_primary) ?? sorted[0];
  if (primary?.url && typeof primary.url === "string" && primary.url.trim()) return primary.url.trim();
  return "/placeholder-property.svg";
}

export function formatMoney(price: number, currency: string) {
  const cur = currency || "EUR";
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: cur === "TRY" ? "TRY" : cur === "GBP" ? "GBP" : "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${price.toLocaleString("tr-TR")} ${cur}`;
  }
}

export function daysAgo(from: Date | string | undefined | null) {
  if (!from) return 0;
  const date = typeof from === "string" ? new Date(from) : from;
  if (isNaN(date.getTime())) return 0;
  const ms = Date.now() - date.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}
