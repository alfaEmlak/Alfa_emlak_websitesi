import type { Listing, ListingImage } from "@prisma/client";
import { OWNER_CONTACT_PRIVATE_KEY } from "@/lib/owner-contact-private";
import { titleDeedOwnershipLabel } from "@/lib/title-deed-ownership";
import { landParcelHighlightLinesFromDetailFields, listingPropertyTypeIsArsa } from "@/lib/land-parcel-detail";
import {
  listingPropertyTypeIsTicari,
  ticariHighlightLinesFromDetailFields,
} from "@/lib/commercial-parcel-detail";
import {
  OWNED_FLOORS_LAYOUT_KEYS,
  OWNED_FLOORS_SCOPE_KEYS,
} from "@/lib/owned-floors-detail";

export type DetailFieldEntry = { value: string; visible: boolean };
export type DetailFieldsMap = Record<string, DetailFieldEntry>;

export const DETAIL_FIELD_LABELS: Record<string, string> = {
  salesPrice: "Satış Fiyatı",
  listingNo: "İlan Numarası",
  statusText: "Durumu",
  housingType: "Konut Tipi",
  roomType: "Oda Tipi",
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
  landImarDurumu: "İmar durumu",
  landToplamImarOrani: "Toplam imar oranı",
  landTabanOrani: "Taban oranı",
  landMaxKat: "Mülkiyet kaç kat çıkabilir",
  landKonumOzellikleri: "Konum özellikleri",
  ticariAnaCadde: "Ana cadde",
  ticariAraSokak: "Ara sokak",
  ticariAyriOtopark: "Ayrı otopark",
  ticariKendiBodrum: "Kendine ait bodrum",
  ownedFloorsScope: "Sahip olunan kat",
  ownedFloorsLayout: "Çok katlı tip",
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

function formatOwnedFloorsScopeTr(value: string): string {
  return value === OWNED_FLOORS_SCOPE_KEYS.multiple ? "Birden fazla kata sahip" : "Tek kata sahip";
}

function formatOwnedFloorsLayoutTr(value: string, customFloorCount?: string): string {
  if (value === OWNED_FLOORS_LAYOUT_KEYS.duplex) return "Dubleks";
  if (value === OWNED_FLOORS_LAYOUT_KEYS.triplex) return "Tripleks";
  if (value === OWNED_FLOORS_LAYOUT_KEYS.whole_building) return "Tüm bina";
  if (value === OWNED_FLOORS_LAYOUT_KEYS.custom) {
    const n = String(customFloorCount ?? "").trim();
    return n ? `Elle: ${n} kat` : "Elle belirtilen kat sayısı";
  }
  return value;
}

export function visibleDetailRows(raw: string | null | undefined) {
  const fields = parseDetailFields(raw);
  const scopeRaw = String(fields.ownedFloorsScope?.value ?? "").trim();
  return Object.entries(fields)
    .filter(
      ([key, v]) =>
        key !== OWNER_CONTACT_PRIVATE_KEY &&
        !key.startsWith("land") &&
        !key.startsWith("ticari") &&
        key !== "ownedFloorsFloorCount" &&
        typeof v === "object" &&
        v !== null &&
        "visible" in v &&
        (v as DetailFieldEntry).visible &&
        String((v as DetailFieldEntry).value ?? "").trim() !== "" &&
        !(
          key === "ownedFloorsLayout" &&
          scopeRaw !== OWNED_FLOORS_SCOPE_KEYS.multiple
        ),
    )
    .map(([key, v]) => {
      const entry = v as DetailFieldEntry;
      let displayValue = entry.value;
      if (key === "ownedFloorsScope") {
        displayValue = formatOwnedFloorsScopeTr(String(entry.value ?? ""));
      } else if (key === "ownedFloorsLayout") {
        displayValue = formatOwnedFloorsLayoutTr(
          String(entry.value ?? ""),
          String(fields.ownedFloorsFloorCount?.value ?? ""),
        );
      } else if (key === "buildingAge") {
        const valStr = String(entry.value ?? "").trim().toLowerCase();
        if (
          valStr === "0 yaşında" ||
          valStr === "sıfır yaşında" ||
          valStr === "sifir yasinda" ||
          valStr === "0 yaş" ||
          valStr === "0 yas" ||
          valStr === "sıfır" ||
          valStr === "sifir" ||
          valStr === "0"
        ) {
          displayValue = "Sıfır";
        }
      }
      return {
        key,
        label: DETAIL_FIELD_LABELS[key] ?? key,
        value: displayValue,
      };
    });
}

/** Admin/danışman checkbox’ları + serbest “Özellikler” satırları — tek listede, tekrarsız. */
const LISTING_BOOLEAN_HIGHLIGHT_LABELS: { key: string; label: string }[] = [
  { key: "hasPool", label: "Havuz" },
  { key: "hasGarden", label: "Bahçe" },
  { key: "hasFireplace", label: "Şömine" },
  { key: "hasParking", label: "Otopark" },
  { key: "furnished", label: "Eşyalı" },
  { key: "seaView", label: "Deniz Manzarası" },
  { key: "hasElevator", label: "Asansörlü" },
  { key: "hasBalcony", label: "Balkon" },
  { key: "hasTerrace", label: "Teras" },
  { key: "hasAirConditioning", label: "Klima" },
  { key: "hasGatedCommunity", label: "Güvenlikli site" },
];

export function mergeListingHighlightLines(listing: Record<string, unknown>): string[] {
  const isArsa = listingPropertyTypeIsArsa(listing.propertyType ?? listing.property_type);
  const isTicari =
    !isArsa && listingPropertyTypeIsTicari(listing.propertyType ?? listing.property_type);
  const fromBools = isArsa
    ? []
    : isTicari
      ? []
      : LISTING_BOOLEAN_HIGHLIGHT_LABELS.filter(({ key }) => listing[key] === true).map(({ label }) => label);
  const fromLandArsa = isArsa
    ? landParcelHighlightLinesFromDetailFields(listing.detailFields ?? listing.detail_fields)
    : [];
  const fromTicariTags = isTicari
    ? ticariHighlightLinesFromDetailFields(listing.detailFields ?? listing.detail_fields)
    : [];
  const fromTicariElevator =
    isTicari && listing.hasElevator === true ? ["Asansör"] : [];
  const tapuLabel = titleDeedOwnershipLabel(
    listing.titleDeedOwnership ?? listing.title_deed_ownership,
  );
  const tapuLine = tapuLabel ? `Tapu mülkiyeti: ${tapuLabel}` : null;
  const rawFeatures = listing.features;
  const asString =
    typeof rawFeatures === "string"
      ? rawFeatures
      : rawFeatures != null
        ? JSON.stringify(rawFeatures)
        : null;
  const fromText = parseStringArray(asString);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of [
    ...(tapuLine ? [tapuLine] : []),
    ...fromLandArsa,
    ...fromTicariTags,
    ...fromTicariElevator,
    ...fromBools,
    ...fromText,
  ]) {
    const t = line.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
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
  const cur = (currency || "EUR").toUpperCase();
  const iso =
    cur === "TRY" ? "TRY" : cur === "USD" ? "USD" : cur === "GBP" ? "GBP" : "EUR";
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: iso,
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
