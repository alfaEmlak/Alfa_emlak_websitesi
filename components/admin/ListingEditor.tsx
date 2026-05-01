"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Listing, ListingImage } from "@prisma/client";
import { saveListing, suggestListingId, type ListingSavePayload } from "@/app/karealfaadmin/actions";
import { kktcCities, kktcRegions, kktcCityCoords, kktcRegionCoords } from "@/lib/kktc-regions";
import {
  NEARBY_POI_CATEGORIES,
  parseNearbyPoiCategoriesJson,
  serializeNearbyPoiCategoriesJson,
  type NearbyPoiCategoryId,
} from "@/lib/nearby-poi";
import { parseLatLngPair, parseNearby, parseStringArray } from "@/lib/listing-utils";
import { type FeedLookups, type LookupOption, groupAreasByCity } from "@/lib/feeds/lookup-types";
import { AdminIcon, type AdminIconName } from "@/components/admin/AdminIcon";
import { NearbyPoiAdminPreview } from "@/components/admin/NearbyPoiAdminPreview";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

const LocationPicker = dynamic(() => import("@/components/admin/LocationPicker"), { ssr: false });

const LOCATION_SELECT_CLASS =
  "mt-1 w-full rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/20";

type GalleryRow = { url: string; sortOrder: number; isPrimary: boolean };

const LIKELY_IMAGE_EXT = /\.(jpe?g|jfif|png|gif|webp|bmp|heic|heif|avif|tif{1,2})$/i;

function isSelectableImageFile(f: File): boolean {
  const t = (f.type || "").trim().toLowerCase();
  if (t.startsWith("image/")) return true;
  if ((t === "" || t === "application/octet-stream") && LIKELY_IMAGE_EXT.test(f.name)) return true;
  return false;
}

async function postUploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", {
    method: "POST",
    body: fd,
    credentials: "same-origin",
  });
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  let data: { url?: string; error?: string };
  if (ct.includes("application/json")) {
    data = (await res.json()) as { url?: string; error?: string };
  } else {
    const text = (await res.text()).trim().slice(0, 200);
    throw new Error(
      text
        ? `Sunucu yanıtı (${res.status}): ${text}`
        : `Yükleme başarısız (HTTP ${res.status}).`,
    );
  }
  if (!res.ok) throw new Error(data.error ?? "Yükleme başarısız");
  if (!data.url) throw new Error("Sunucu adres döndürmedi");
  return data.url;
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

type ExtHangiev = {
  property_type_id?: number | string | null;
  area_id?: number | string | null;
  room_count_id?: number | string | null;
  build_age_id?: number | string | null;
  furnishing_id?: number | string | null;
  price_for?: "T" | "U" | null;
  reference_no?: string | null;
};

type Props = {
  listing:
    | ((Listing & { images: ListingImage[] }) & {
        translations?: string | null;
        exportTo101evler?: boolean | null;
        ext101evler?: Ext101evler | string | null;
        exportToHangiev?: boolean | null;
        extHangiev?: ExtHangiev | string | null;
        type_id_101?: number | null;
        area_id_101?: number | null;
        title_type_id_101?: number | null;
        room_count_id_101?: number | null;
        build_age_id_101?: number | null;
        furnishing_id_101?: number | null;
        billing_cycle_id_101?: number | null;
        price_for_101?: string | null;
        reference_no_101?: string | null;
        property_type_id_hg?: number | null;
        area_id_hg?: number | null;
        room_count_id_hg?: number | null;
        build_age_id_hg?: number | null;
        furnishing_id_hg?: number | null;
        price_for_hg?: string | null;
        reference_no_hg?: string | null;
      })
    | null;
  suggestedId: string;
  agents?: { id: string; name: string; email: string; phone: string | null; photo: string | null; title: string | null; is_active?: boolean }[];
  viewerRole: "ADMIN" | "CONSULTANT";
  lookups: FeedLookups;
};

function parseExt101(v: unknown): Ext101evler {
  if (!v) return {};
  if (typeof v === "string") {
    try { return JSON.parse(v) as Ext101evler; } catch { return {}; }
  }
  if (typeof v === "object") return v as Ext101evler;
  return {};
}

function parseExtHangiev(v: unknown): ExtHangiev {
  if (!v) return {};
  if (typeof v === "string") {
    try { return JSON.parse(v) as ExtHangiev; } catch { return {}; }
  }
  if (typeof v === "object") return v as ExtHangiev;
  return {};
}

const CITY_VALUE_TO_101_LABEL: Record<string, string> = {
  lefkosa: "Lefkoşa",
  girne: "Girne",
  gazimagusa: "Gazimağusa",
  guzelyurt: "Güzelyurt",
  iskele: "İskele",
  lefke: "Lefke",
};

const REGION_VALUE_101_ALIASES: Record<string, string> = {
  "gazimagusa-merkez": "Mağusa Merkez",
  yenibogazici: "Yeni Boğaziçi",
  surlarici: "Lefkoşa Surlariçi",
  "lefke-merkez": "Lefke",
  "guzelyurt-merkez": "Güzelyurt Merkez",
  karaolanoglu: "Karaoğlanoğlu",
  kilicaslan: "Kılıçarslan",
};

function normalize101Text(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]/g, "");
}

function inferTypeIdFromOptions(propertyType: string, options: LookupOption[]): string {
  const key = propertyType.trim().toLocaleLowerCase("tr-TR");
  if (!key) return "";
  if (key === "arsa") return findId(options, "Arsa");
  if (key === "ticari") return findId(options, "İş Yeri");
  if (key === "konut") return findId(options, "Daire");
  return findId(options, propertyType);
}

function findId(options: LookupOption[], label: string): string {
  const target = normalize101Text(label);
  const match = options.find((o) => normalize101Text(o.label) === target);
  return match ? String(match.id) : "";
}

function inferAreaCity(cityValue: string): string {
  return CITY_VALUE_TO_101_LABEL[cityValue] ?? "";
}

function inferAreaId(
  cityValue: string,
  regionValue: string,
  groupedAreas: Record<string, LookupOption[]>,
): string {
  const cityLabel = inferAreaCity(cityValue);
  if (!cityLabel || !regionValue) return "";

  const regionLabel =
    REGION_VALUE_101_ALIASES[regionValue] ??
    kktcRegions[cityValue]?.find((r) => r.v === regionValue)?.l ??
    regionValue;

  const target = normalize101Text(regionLabel);
  const match = groupedAreas[cityLabel]?.find((option) => normalize101Text(option.label) === target);
  return match ? String(match.id) : "";
}

function inferRoomCountId(bedrooms: string, livingRooms: string, options: LookupOption[]): string {
  const bedroomCount = Number.parseInt(bedrooms, 10);
  if (!Number.isFinite(bedroomCount)) return "";

  const livingRoomCount = Number.parseInt(livingRooms, 10);
  const label = Number.isFinite(livingRoomCount)
    ? `${bedroomCount}+${livingRoomCount}`
    : String(bedroomCount);

  return findId(options, label);
}

function inferBuildAgeIdFromValue(buildingAge: string): string {
  const normalized = buildingAge.trim().toLocaleLowerCase("tr-TR");
  if (!normalized) return "";
  if (normalized.includes("proje")) return "12";

  const age = Number.parseInt(normalized, 10);
  if (!Number.isFinite(age) || age < 0) return "";
  if (age === 0) return "10";
  if (age >= 1 && age <= 4) return String(age);
  if (age === 5) return "11";
  if (age >= 6 && age <= 10) return "5";
  if (age >= 11 && age <= 15) return "6";
  if (age >= 16 && age <= 20) return "7";
  if (age >= 21 && age <= 25) return "8";
  return "9";
}

function getInitialCity(val?: string | null) {
  if (!val) return "";
  const match = kktcCities.find(c => c.v === val || c.l === val || c.l.toLowerCase() === val.toLowerCase() || c.v.toLowerCase() === val.toLowerCase());
  return match ? match.v : val;
}

function getInitialRegion(cityVal: string, val?: string | null) {
  if (!val || !cityVal) return "";
  const regions = kktcRegions[cityVal] || [];
  const match = regions.find(r => r.v === val || r.l === val || r.l.toLowerCase() === val.toLowerCase() || r.v.toLowerCase() === val.toLowerCase());
  return match ? match.v : val;
}

export function ListingEditor({ listing, suggestedId, agents, viewerRole, lookups }: Props) {
  const t = useTranslations("Wizard");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);

  // ── DB lookup'lar (101evler & Hangiev) ─────────────────────────────
  const TYPE_ID_OPTIONS = lookups.ext101.types;
  const TITLE_TYPE_OPTIONS = lookups.ext101.titleTypes;
  const ROOM_COUNT_OPTIONS = lookups.ext101.roomCounts;
  const BUILD_AGE_OPTIONS = lookups.ext101.buildAges;
  const FURNISHING_OPTIONS = lookups.ext101.furnishing;
  const BILLING_CYCLE_OPTIONS = lookups.ext101.billingCycles;
  const AREA_ID_OPTIONS = useMemo(() => groupAreasByCity(lookups.ext101.areas), [lookups.ext101.areas]);
  const HANGIEV_PROPERTY_TYPE_OPTIONS = lookups.hangiev.propertyTypes;
  const HANGIEV_ROOM_COUNT_OPTIONS = lookups.hangiev.roomCounts;
  const HANGIEV_BUILD_AGE_OPTIONS = lookups.hangiev.buildAges;
  const HANGIEV_FURNISHING_OPTIONS = lookups.hangiev.furnishing;
  const HANGIEV_AREA_ID_OPTIONS = useMemo(() => groupAreasByCity(lookups.hangiev.areas), [lookups.hangiev.areas]);

  const CURRENCY_CODE_MAP = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of lookups.ext101.currencies) {
      const num = typeof c.code === "number" ? c.code : Number(c.code);
      if (Number.isFinite(num)) map[c.iso] = num;
    }
    return map;
  }, [lookups.ext101.currencies]);

  const HANGIEV_CURRENCY_CODE_MAP = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of lookups.hangiev.currencies) map[c.iso] = String(c.code);
    return map;
  }, [lookups.hangiev.currencies]);

  // ── infer wrapper'lar (eski API'yi koruyor, içte DB lookup'larını kullanıyor)
  const infer101TypeId = (propertyType: string) => inferTypeIdFromOptions(propertyType, TYPE_ID_OPTIONS);
  const infer101AreaCity = (cityValue: string) => inferAreaCity(cityValue);
  const infer101AreaId = (cityValue: string, regionValue: string) =>
    inferAreaId(cityValue, regionValue, AREA_ID_OPTIONS);
  const infer101RoomCountId = (bedrooms: string, livingRooms: string) =>
    inferRoomCountId(bedrooms, livingRooms, ROOM_COUNT_OPTIONS);
  const infer101BuildAgeId = (buildingAge: string) => inferBuildAgeIdFromValue(buildingAge);

  const inferHangievPropertyTypeId = (propertyType: string) =>
    inferTypeIdFromOptions(propertyType, HANGIEV_PROPERTY_TYPE_OPTIONS);
  const inferHangievAreaCity = (cityValue: string) => inferAreaCity(cityValue);
  const inferHangievAreaId = (cityValue: string, regionValue: string) =>
    inferAreaId(cityValue, regionValue, HANGIEV_AREA_ID_OPTIONS);
  const inferHangievRoomCountId = (bedrooms: string, livingRooms: string) =>
    inferRoomCountId(bedrooms, livingRooms, HANGIEV_ROOM_COUNT_OPTIONS);
  const inferHangievBuildAgeId = (buildingAge: string) => inferBuildAgeIdFromValue(buildingAge);

  const PROPERTY_LABELS: Record<string, string> = {
    bedrooms: t("propertyLabels.bedrooms"),
    bathrooms: t("propertyLabels.bathrooms"),
    areaM2: t("propertyLabels.areaM2"),
    plotAreaM2: t("propertyLabels.plotAreaM2"),
    floor: t("propertyLabels.floor"),
    buildingAge: t("propertyLabels.buildingAge"),
    livingRooms: t("propertyLabels.livingRooms"),
  };

  const CONSULTANT_LABELS: Record<string, string> = {
    consultantName: t("consultantLabels.consultantName"),
    consultantPhone: t("consultantLabels.consultantPhone"),
    consultantWhatsapp: t("consultantLabels.consultantWhatsapp"),
    consultantEmail: t("consultantLabels.consultantEmail"),
    consultantOffice: t("consultantLabels.consultantOffice"),
    consultantPhoto: t("consultantLabels.consultantPhoto"),
    consultantOfficeLogo: t("consultantLabels.consultantOfficeLogo"),
  };

  const initialGallery = useMemo((): GalleryRow[] => {
    if (!listing?.images?.length) return [];
    return [...listing.images]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((im, i) => ({ url: im.url, sortOrder: i, isPrimary: im.isPrimary }));
  }, [listing]);

  const [gallery, setGallery] = useState<GalleryRow[]>(initialGallery);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadHint, setUploadHint] = useState("");

  const initialCity = getInitialCity(listing?.city);
  const initialRegion = getInitialRegion(initialCity, listing?.region);

  // Yeni `*_101` / `*_hg` kolonları öncelikli, JSONB ext_*  fallback olarak okunur.
  const ext101FromJson = parseExt101(listing?.ext101evler ?? null);
  const extHangievFromJson = parseExtHangiev(listing?.extHangiev ?? null);
  const initialExt101: Ext101evler = {
    type_id: listing?.type_id_101 ?? ext101FromJson.type_id ?? null,
    area_id: listing?.area_id_101 ?? ext101FromJson.area_id ?? null,
    title_type_id: listing?.title_type_id_101 ?? ext101FromJson.title_type_id ?? null,
    room_count_id: listing?.room_count_id_101 ?? ext101FromJson.room_count_id ?? null,
    build_age_id: listing?.build_age_id_101 ?? ext101FromJson.build_age_id ?? null,
    furnishing_id: listing?.furnishing_id_101 ?? ext101FromJson.furnishing_id ?? null,
    billing_cycle_id: listing?.billing_cycle_id_101 ?? ext101FromJson.billing_cycle_id ?? null,
    price_for: (listing?.price_for_101 as "T" | "U" | null | undefined) ?? ext101FromJson.price_for ?? null,
    reference_no: listing?.reference_no_101 ?? ext101FromJson.reference_no ?? null,
  };
  const initialExtHangiev: ExtHangiev = {
    property_type_id: listing?.property_type_id_hg ?? extHangievFromJson.property_type_id ?? null,
    area_id: listing?.area_id_hg ?? extHangievFromJson.area_id ?? null,
    room_count_id: listing?.room_count_id_hg ?? extHangievFromJson.room_count_id ?? null,
    build_age_id: listing?.build_age_id_hg ?? extHangievFromJson.build_age_id ?? null,
    furnishing_id: listing?.furnishing_id_hg ?? extHangievFromJson.furnishing_id ?? null,
    price_for: (listing?.price_for_hg as "T" | "U" | null | undefined) ?? extHangievFromJson.price_for ?? null,
    reference_no: listing?.reference_no_hg ?? extHangievFromJson.reference_no ?? null,
  };

  const [form, setForm] = useState({
    listingId: listing?.listingId ?? suggestedId,
    title: listing?.title ?? "",
    kind: listing?.kind ?? "SATILIK",
    propertyType: listing?.propertyType ?? "Konut",
    price: listing != null ? String(listing.price) : "",
    currency: listing?.currency ?? "EUR",
    shortDescription: listing?.shortDescription ?? "",
    city: initialCity,
    region: initialRegion,
    neighborhood: "",
    fullAddress: listing?.fullAddress ?? "",
    longDescription: listing?.longDescription ?? "",
    coverImage: listing?.coverImage ?? "",
    bedrooms: listing?.bedrooms != null ? String(listing.bedrooms) : "",
    bathrooms: listing?.bathrooms != null ? String(listing.bathrooms) : "",
    areaM2: listing?.areaM2 != null ? String(listing.areaM2) : "",
    plotAreaM2: listing?.plotAreaM2 != null ? String(listing.plotAreaM2) : "",
    floor: listing?.floor ?? "",
    buildingAge: listing?.buildingAge != null ? String(listing.buildingAge) : "",
    livingRooms: listing?.livingRooms != null ? String(listing.livingRooms) : "",
    hasPool: listing?.hasPool ?? false,
    hasGarden: listing?.hasGarden ?? false,
    hasFireplace: listing?.hasFireplace ?? false,
    hasParking: listing?.hasParking ?? false,
    furnished: listing?.furnished ?? false,
    seaView: listing?.seaView ?? false,
    featuresText: parseStringArray(listing?.features ?? null).join("\n"),
    coordinates:
      listing?.lat != null && listing?.lng != null ? `${listing.lat},${listing.lng}` : "",
    mapEnabled: listing?.mapEnabled ?? false,
    virtualTourUrl: listing?.virtualTourUrl ?? "",
    virtualTourEnabled: listing?.virtualTourEnabled ?? false,
    videoUrl: listing?.videoUrl ?? "",
    videoEnabled: listing?.videoEnabled ?? false,
    nearbyEnabled: listing?.nearbyEnabled ?? false,
    nearbyText: JSON.stringify(parseNearby(listing?.nearbyPlaces ?? null), null, 2),
    poiCategories: parseNearbyPoiCategoriesJson(listing?.nearbyPoiCategoriesJson),
    badgeFeatured: listing?.badgeFeatured ?? false,
    badgeExclusive: listing?.badgeExclusive ?? false,
    badgeVirtualTour: listing?.badgeVirtualTour ?? false,
    badgeVideo: listing?.badgeVideo ?? false,
    badgeNew: listing?.badgeNew ?? false,
    badgePriceDrop: listing?.badgePriceDrop ?? false,
    consultantName: listing?.consultantName ?? "",
    consultantPhone: listing?.consultantPhone ?? "",
    consultantWhatsapp: listing?.consultantWhatsapp ?? "",
    consultantEmail: listing?.consultantEmail ?? "",
    consultantOffice: listing?.consultantOffice ?? "",
    consultantPhoto: listing?.consultantPhoto ?? "",
    consultantOfficeLogo: listing?.consultantOfficeLogo ?? "",
    selectedAgentId: "",
    publishStatus: listing?.publishStatus ?? (viewerRole === "ADMIN" ? "DRAFT" : "PENDING_APPROVAL"),
    statsShowViews: listing?.statsShowViews ?? true,
    statsShowFavs: listing?.statsShowFavs ?? true,
    statsShowRating: listing?.statsShowRating ?? false,
    rating: listing?.rating != null ? String(listing.rating) : "",
    favoritesCount: listing?.favoritesCount ?? 0,
    translations: typeof listing?.translations === "string" ? listing.translations : "{}",
    exportTo101evler: listing?.exportTo101evler ?? false,
    ext101_type_id: initialExt101.type_id != null ? String(initialExt101.type_id) : "",
    ext101_area_id: initialExt101.area_id != null ? String(initialExt101.area_id) : "",
    ext101_title_type_id: initialExt101.title_type_id != null ? String(initialExt101.title_type_id) : "",
    ext101_room_count_id: initialExt101.room_count_id != null ? String(initialExt101.room_count_id) : "",
    ext101_build_age_id: initialExt101.build_age_id != null ? String(initialExt101.build_age_id) : "",
    ext101_furnishing_id: initialExt101.furnishing_id != null ? String(initialExt101.furnishing_id) : "",
    ext101_billing_cycle_id: initialExt101.billing_cycle_id != null ? String(initialExt101.billing_cycle_id) : "",
    ext101_price_for: (initialExt101.price_for as string | null | undefined) ?? "T",
    ext101_reference_no: initialExt101.reference_no ?? "",
    ext101_area_city: infer101AreaCity(initialCity),
    exportToHangiev: listing?.exportToHangiev ?? false,
    hangiev_property_type_id: initialExtHangiev.property_type_id != null ? String(initialExtHangiev.property_type_id) : "",
    hangiev_area_id: initialExtHangiev.area_id != null ? String(initialExtHangiev.area_id) : "",
    hangiev_room_count_id: initialExtHangiev.room_count_id != null ? String(initialExtHangiev.room_count_id) : "",
    hangiev_build_age_id: initialExtHangiev.build_age_id != null ? String(initialExtHangiev.build_age_id) : "",
    hangiev_furnishing_id: initialExtHangiev.furnishing_id != null ? String(initialExtHangiev.furnishing_id) : "",
    hangiev_price_for: (initialExtHangiev.price_for as string | null | undefined) ?? "T",
    hangiev_reference_no: initialExtHangiev.reference_no ?? "",
    hangiev_area_city: inferHangievAreaCity(initialCity),
  });

  function with101Defaults(current: typeof form, overwrite = false): typeof form {
    const apply = (existing: string, inferred: string) => (overwrite ? inferred || existing : existing || inferred);

    return {
      ...current,
      ext101_type_id: apply(current.ext101_type_id, infer101TypeId(current.propertyType)),
      ext101_area_city: apply(current.ext101_area_city, infer101AreaCity(current.city)),
      ext101_area_id: apply(current.ext101_area_id, infer101AreaId(current.city, current.region)),
      ext101_room_count_id: apply(current.ext101_room_count_id, infer101RoomCountId(current.bedrooms, current.livingRooms)),
      ext101_build_age_id: apply(current.ext101_build_age_id, infer101BuildAgeId(current.buildingAge)),
      ext101_furnishing_id: apply(current.ext101_furnishing_id, current.furnished ? "3" : "1"),
      ext101_price_for: current.ext101_price_for || "T",
      ext101_reference_no: current.ext101_reference_no || current.listingId,
    };
  }

  function setExportTo101evler(enabled: boolean) {
    setForm((current) => {
      const next = { ...current, exportTo101evler: enabled };
      return enabled ? with101Defaults(next) : next;
    });
  }

  function refresh101Defaults() {
    setForm((current) => with101Defaults(current, true));
  }

  function withHangievDefaults(current: typeof form, overwrite = false): typeof form {
    const apply = (existing: string, inferred: string) => (overwrite ? inferred || existing : existing || inferred);

    return {
      ...current,
      hangiev_property_type_id: apply(current.hangiev_property_type_id, inferHangievPropertyTypeId(current.propertyType)),
      hangiev_area_city: apply(current.hangiev_area_city, inferHangievAreaCity(current.city)),
      hangiev_area_id: apply(current.hangiev_area_id, inferHangievAreaId(current.city, current.region)),
      hangiev_room_count_id: apply(current.hangiev_room_count_id, inferHangievRoomCountId(current.bedrooms, current.livingRooms)),
      hangiev_build_age_id: apply(current.hangiev_build_age_id, inferHangievBuildAgeId(current.buildingAge)),
      hangiev_furnishing_id: apply(current.hangiev_furnishing_id, current.furnished ? "3" : "1"),
      hangiev_price_for: current.hangiev_price_for || "T",
      hangiev_reference_no: current.hangiev_reference_no || current.listingId,
    };
  }

  function setExportToHangiev(enabled: boolean) {
    setForm((current) => {
      const next = { ...current, exportToHangiev: enabled };
      return enabled ? withHangievDefaults(next) : next;
    });
  }

  function refreshHangievDefaults() {
    setForm((current) => withHangievDefaults(current, true));
  }

  const translations = useMemo(() => {
    try {
      return JSON.parse(form.translations) as Record<
        string,
        { title: string; shortDescription: string; longDescription: string }
      >;
    } catch {
      return {};
    }
  }, [form.translations]);

  const setTranslation = (lang: string, field: "title" | "shortDescription" | "longDescription", value: string) => {
    const newTrans = { ...translations };
    if (!newTrans[lang]) newTrans[lang] = { title: "", shortDescription: "", longDescription: "" };
    newTrans[lang][field] = value;
    set("translations", JSON.stringify(newTrans));
  };

  const set = (k: keyof typeof form, v: string | boolean | number) =>
    setForm((f) => {
      let next = { ...f, [k]: v } as typeof form;

      if (next.exportTo101evler) {
        if (k === "propertyType") {
          next = { ...next, ext101_type_id: infer101TypeId(next.propertyType) };
        }
        if (k === "bedrooms" || k === "livingRooms") {
          next = { ...next, ext101_room_count_id: infer101RoomCountId(next.bedrooms, next.livingRooms) };
        }
        if (k === "buildingAge") {
          next = { ...next, ext101_build_age_id: infer101BuildAgeId(next.buildingAge) };
        }
        if (k === "furnished") {
          next = { ...next, ext101_furnishing_id: next.furnished ? "3" : "1" };
        }
        if (k === "listingId" && !next.ext101_reference_no) {
          next = { ...next, ext101_reference_no: next.listingId };
        }
      }

      if (next.exportToHangiev) {
        if (k === "propertyType") {
          next = { ...next, hangiev_property_type_id: inferHangievPropertyTypeId(next.propertyType) };
        }
        if (k === "bedrooms" || k === "livingRooms") {
          next = { ...next, hangiev_room_count_id: inferHangievRoomCountId(next.bedrooms, next.livingRooms) };
        }
        if (k === "buildingAge") {
          next = { ...next, hangiev_build_age_id: inferHangievBuildAgeId(next.buildingAge) };
        }
        if (k === "furnished") {
          next = { ...next, hangiev_furnishing_id: next.furnished ? "3" : "1" };
        }
        if (k === "listingId" && !next.hangiev_reference_no) {
          next = { ...next, hangiev_reference_no: next.listingId };
        }
      }

      return next;
    });

  const previewCoords = useMemo(() => {
    const p = parseLatLngPair(form.coordinates);
    if (!p?.lat || !p?.lng) return { lat: null as number | null, lng: null as number | null };
    const la = Number(p.lat);
    const ln = Number(p.lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return { lat: null, lng: null };
    return { lat: la, lng: ln };
  }, [form.coordinates]);

  const focusCoords = useMemo(() => {
    if (form.region && kktcRegionCoords[form.region]) {
      return kktcRegionCoords[form.region];
    }
    if (form.city && kktcCityCoords[form.city]) {
      // Bölge seçili ama koordinatı yoksa bile, biraz daha fazla zoom yap ama şehir merkezine in
      return {
        ...kktcCityCoords[form.city],
        zoom: form.region ? 14 : kktcCityCoords[form.city].zoom
      };
    }
    return null;
  }, [form.city, form.region]);

  function togglePoiCategory(id: NearbyPoiCategoryId) {
    setForm((f) => ({
      ...f,
      poiCategories: { ...f.poiCategories, [id]: !f.poiCategories[id] },
    }));
  }

  function handleAgentSelect(agentId: string) {
    set("selectedAgentId", agentId);
    if (!agentId) {
      set("consultantName", "");
      set("consultantPhone", "");
      set("consultantWhatsapp", "");
      set("consultantEmail", "");
      set("consultantPhoto", "");
      return;
    }
    const agent = agents?.find(a => a.id === agentId);
    if (agent) {
      set("consultantName", agent.name);
      set("consultantPhone", agent.phone ?? "");
      set("consultantEmail", agent.email);
      set("consultantPhoto", agent.photo ?? "");
    }
  }

  function handleMapLocationSelect(lat: number, lng: number, address?: { fullAddress: string; city: string; region: string; neighborhood: string }) {
    setForm((f) => {
      const updates: typeof f = {
        ...f,
        coordinates: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        mapEnabled: true,
      };
      if (address) {
        updates.fullAddress = address.fullAddress;
        if (address.city) {
          const match = kktcCities.find(c => c.l.toLowerCase() === address.city.toLowerCase() || c.v.toLowerCase() === address.city.toLowerCase());
          updates.city = match ? match.v : address.city;
        }
        const regionParts = [address.region, address.neighborhood].filter(Boolean).join(", ");
        if (regionParts && !f.region) {
          updates.region = regionParts;
        }
      }
      let next = updates;
      if (next.exportTo101evler) next = with101Defaults(next);
      if (next.exportToHangiev) next = withHangievDefaults(next);
      return next;
    });
  }

  async function onCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const picked = input.files?.length ? Array.from(input.files) : [];
    input.value = "";
    const file = picked[0];
    if (!file) return;
    if (!isSelectableImageFile(file)) {
      setMessage(t("messages.uploadNotImage"));
      return;
    }
    setMessage(null);
    setUploadBusy(true);
    setUploadHint(t("messages.uploadingCover"));
    try {
      const url = await postUploadFile(file);
      set("coverImage", url);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("messages.uploadError"));
    } finally {
      setUploadBusy(false);
      setUploadHint("");
    }
  }

  async function onGalleryFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const picked = input.files?.length ? Array.from(input.files) : [];
    input.value = "";
    if (!picked.length) return;
    const list = picked.filter(isSelectableImageFile);
    if (!list.length) {
      setMessage(t("messages.imageNotRecognized"));
      return;
    }
    setMessage(null);
    setUploadBusy(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < list.length; i++) {
        setUploadHint(t("messages.uploadingCount", { current: i + 1, total: list.length }));
        urls.push(await postUploadFile(list[i]));
      }
      setGallery((g) => {
        const had = g.filter((x) => x.url.trim());
        const merged: GalleryRow[] = [
          ...had.map((x, i) => ({ ...x, sortOrder: i })),
          ...urls.map((url, i) => ({
            url,
            sortOrder: had.length + i,
            isPrimary: had.length === 0 && i === 0,
          })),
        ];
        const withPrimary =
          merged.some((x) => x.isPrimary) || !merged.length
            ? merged
            : merged.map((x, j) => ({ ...x, isPrimary: j === 0 }));
        return withPrimary.map((x, j) => ({ ...x, sortOrder: j }));
      });
      setForm((f) => {
        if (f.coverImage.trim()) return f;
        return { ...f, coverImage: urls[0] ?? f.coverImage };
      });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("messages.uploadError"));
    } finally {
      setUploadBusy(false);
      setUploadHint("");
    }
  }

  function moveGallery(idx: number, dir: -1 | 1) {
    setGallery((prev) => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[j]] = [copy[j], copy[idx]];
      return copy.map((row, i) => ({ ...row, sortOrder: i }));
    });
  }

  function removeGalleryRow(idx: number) {
    setGallery((prev) => {
      const row = prev[idx];
      if (!row) return prev;
      const removedUrl = row.url.trim();
      const next = prev.filter((_, i) => i !== idx);
      const withPrimary =
        row.isPrimary && next.length
          ? next.map((r, i) => ({ ...r, sortOrder: i, isPrimary: i === 0 }))
          : next.map((r, i) => ({ ...r, sortOrder: i }));
      if (removedUrl) {
        const nextCover = (withPrimary.find((r) => r.isPrimary) ?? withPrimary[0])?.url?.trim() ?? "";
        requestAnimationFrame(() => {
          setForm((f) => (f.coverImage.trim() !== removedUrl ? f : { ...f, coverImage: nextCover }));
        });
      }
      return withPrimary;
    });
  }

  function makeGalleryPrimary(idx: number) {
    setGallery((prev) => {
      const url = prev[idx]?.url?.trim() ?? "";
      if (url) {
        requestAnimationFrame(() => setForm((f) => ({ ...f, coverImage: url })));
      }
      return prev.map((g, i) => ({ ...g, isPrimary: i === idx }));
    });
  }

  function normalizeGalleryForSave(rows: GalleryRow[]): GalleryRow[] {
    const trimmed = rows.filter((g) => g.url.trim());
    if (!trimmed.length) return [];
    let next = trimmed.map((g, i) => ({ ...g, sortOrder: i }));
    if (!next.some((g) => g.isPrimary)) {
      next = next.map((g, i) => ({ ...g, isPrimary: i === 0 }));
    }
    return next;
  }

  function saveDraft() {
    startTransition(() => {
      void doSave("DRAFT");
    });
  }

  function publish() {
    startTransition(() => {
      void doSave("PUBLISHED");
    });
  }


  async function doSave(statusOverride?: string) {
    setMessage(null);
    setMessageType(null);
    let preparedForm = form;
    if (preparedForm.exportTo101evler) preparedForm = with101Defaults(preparedForm);
    if (preparedForm.exportToHangiev) preparedForm = withHangievDefaults(preparedForm);
    if (preparedForm !== form) {
      setForm(preparedForm);
    }

    // Step 2 sayısal alan validasyonu (101evler ve Hangiev'in min/max sınırlarına uyum)
    const numericLimits: { key: keyof typeof preparedForm; min: number; max: number; label: string }[] = [
      { key: "bedrooms", min: 0, max: 20, label: PROPERTY_LABELS.bedrooms },
      { key: "bathrooms", min: 0, max: 10, label: PROPERTY_LABELS.bathrooms },
      { key: "floor", min: -5, max: 100, label: PROPERTY_LABELS.floor },
      { key: "buildingAge", min: 0, max: 120, label: PROPERTY_LABELS.buildingAge },
      { key: "livingRooms", min: 0, max: 10, label: PROPERTY_LABELS.livingRooms },
    ];
    const violations: string[] = [];
    for (const { key, min, max, label } of numericLimits) {
      const raw = String(preparedForm[key] ?? "").trim();
      if (raw === "") continue;
      const num = Number(raw);
      if (!Number.isFinite(num) || num < min || num > max) {
        violations.push(`${label} (${min}-${max} arasında olmalı, girilen: ${raw})`);
      }
    }
    if (violations.length > 0) {
      setMessage(`Geçersiz emlak özelliği değerleri: ${violations.join("; ")}.`);
      setMessageType("error");
      setWizardStep(2);
      return;
    }

    if (preparedForm.exportTo101evler) {
      const missing101: string[] = [];
      if (!preparedForm.ext101_type_id) missing101.push("İlan Tipi");
      if (!preparedForm.ext101_area_id) missing101.push("Bölge");
      if (!Object.prototype.hasOwnProperty.call(CURRENCY_CODE_MAP, preparedForm.currency.toUpperCase())) {
        missing101.push("101evler para birimi kodu");
      }
      if (!preparedForm.price || Number(preparedForm.price) <= 0) missing101.push("Fiyat");

      if (missing101.length > 0) {
        setMessage(`101evler'e gönderim için eksik/uyumsuz alanlar: ${missing101.join(", ")}. Lütfen 101evler adımını kontrol edin.`);
        setMessageType("error");
        setWizardStep(missing101.includes("101evler para birimi kodu") || missing101.includes("Fiyat") ? 0 : 5);
        return;
      }
    }

    if (preparedForm.exportToHangiev) {
      const missingHangiev: string[] = [];
      if (!Object.prototype.hasOwnProperty.call(HANGIEV_CURRENCY_CODE_MAP, preparedForm.currency.toUpperCase())) {
        missingHangiev.push("Hangiev para birimi kodu");
      }
      if (!preparedForm.price || Number(preparedForm.price) <= 0) missingHangiev.push("Fiyat");

      if (missingHangiev.length > 0) {
        setMessage(`Hangiev'e gönderim için eksik/uyumsuz alanlar: ${missingHangiev.join(", ")}. Lütfen Hangiev adımını kontrol edin.`);
        setMessageType("error");
        setWizardStep(missingHangiev.includes("Hangiev para birimi kodu") || missingHangiev.includes("Fiyat") ? 0 : 6);
        return;
      }
    }

    const f = preparedForm;
    const featuresLines = f.featuresText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const parsedCoords = parseLatLngPair(f.coordinates);
    if (!parsedCoords || !parsedCoords.lat || !parsedCoords.lng) {
      setMessage("Lütfen haritadan bir konum seçin veya koordinat girin");
      setMessageType("error");
      return;
    }

    const normGallery = normalizeGalleryForSave(gallery);
    let coverOut = f.coverImage.trim();
    if (!coverOut && normGallery.length > 0) {
      const primary = normGallery.find((g) => g.isPrimary) ?? normGallery[0];
      coverOut = primary.url;
    }

    const payload: ListingSavePayload = {
      id: listing?.id,
      originalListingId: listing?.listingId,
      listingId: f.listingId,
      title: f.title,
      kind: f.kind,
      propertyType: f.propertyType,
      city: f.city,
      region: f.region,
      neighborhood: f.neighborhood,
      fullAddress: f.fullAddress,
      price: Number(f.price) || 0,
      currency: f.currency,
      shortDescription: f.shortDescription,
      longDescription: f.longDescription,
      coverImage: coverOut,
      bedrooms: f.bedrooms,
      bathrooms: f.bathrooms,
      areaM2: f.areaM2,
      plotAreaM2: f.plotAreaM2,
      floor: f.floor,
      buildingAge: f.buildingAge,
      livingRooms: f.livingRooms,
      hasPool: f.hasPool,
      hasGarden: f.hasGarden,
      hasFireplace: f.hasFireplace,
      hasParking: f.hasParking,
      furnished: f.furnished,
      seaView: f.seaView,
      detailFields: listing?.detailFields ?? "{}",
      features: JSON.stringify(featuresLines),
      nearbyPlaces: f.nearbyText || "[]",
      nearbyEnabled: f.nearbyEnabled,
      nearbyPoiCategoriesJson: serializeNearbyPoiCategoriesJson(f.poiCategories) ?? "",
      badgeFeatured: f.badgeFeatured,
      badgeExclusive: f.badgeExclusive,
      badgeVirtualTour: f.badgeVirtualTour,
      badgeVideo: f.badgeVideo,
      badgeNew: f.badgeNew,
      badgePriceDrop: f.badgePriceDrop,
      virtualTourUrl: f.virtualTourUrl,
      virtualTourEnabled: f.virtualTourEnabled,
      videoUrl: f.videoUrl,
      videoEnabled: f.videoEnabled,
      lat: parsedCoords.lat,
      lng: parsedCoords.lng,
      mapEnabled: f.mapEnabled,
      consultantName: f.consultantName,
      consultantPhone: f.consultantPhone,
      consultantWhatsapp: f.consultantWhatsapp,
      consultantEmail: f.consultantEmail,
      consultantOffice: f.consultantOffice,
      consultantPhoto: f.consultantPhoto,
      consultantOfficeLogo: f.consultantOfficeLogo,
      publishStatus: statusOverride ?? f.publishStatus,
      statsShowViews: f.statsShowViews,
      statsShowFavs: f.statsShowFavs,
      statsShowRating: f.statsShowRating,
      rating: f.rating,
      favoritesCount: f.favoritesCount,
      translations: f.translations,
      gallery: normGallery,
      exportTo101evler: f.exportTo101evler,
      ext101evler: {
        type_id: f.ext101_type_id ? Number(f.ext101_type_id) : null,
        area_id: f.ext101_area_id ? Number(f.ext101_area_id) : null,
        title_type_id: f.ext101_title_type_id ? Number(f.ext101_title_type_id) : null,
        room_count_id: f.ext101_room_count_id ? Number(f.ext101_room_count_id) : null,
        build_age_id: f.ext101_build_age_id ? Number(f.ext101_build_age_id) : null,
        furnishing_id: f.ext101_furnishing_id ? Number(f.ext101_furnishing_id) : null,
        billing_cycle_id: f.ext101_billing_cycle_id ? Number(f.ext101_billing_cycle_id) : null,
        price_for: (f.ext101_price_for === "U" ? "U" : "T") as "T" | "U",
        reference_no: f.ext101_reference_no?.trim() || null,
      },
      exportToHangiev: f.exportToHangiev,
      extHangiev: {
        property_type_id: f.hangiev_property_type_id ? Number(f.hangiev_property_type_id) : null,
        area_id: f.hangiev_area_id ? Number(f.hangiev_area_id) : null,
        room_count_id: f.hangiev_room_count_id ? Number(f.hangiev_room_count_id) : null,
        build_age_id: f.hangiev_build_age_id ? Number(f.hangiev_build_age_id) : null,
        furnishing_id: f.hangiev_furnishing_id ? Number(f.hangiev_furnishing_id) : null,
        price_for: (f.hangiev_price_for === "U" ? "U" : "T") as "T" | "U",
        reference_no: f.hangiev_reference_no?.trim() || null,
      },
    };

    try {
      const result = await saveListing(payload);
      void result;
      const statusLabel =
        statusOverride === "PUBLISHED"
          ? viewerRole === "ADMIN"
            ? "yayına alındı"
            : "admin onayına gönderildi"
          : "taslak olarak kaydedildi";
      setMessage(`İlan başarıyla ${statusLabel}!`);
      setMessageType("success");
      router.refresh();
      setTimeout(() => {
        router.push("/karealfaadmin/ilanlar");
      }, 1500);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Bilinmeyen hata oluştu";
      console.error("Save error:", e);
      setMessage(`Kayıt hatası: ${errorMsg}`);
      setMessageType("error");
      
      // Duplicate ID hatası varsa yeni ID öner
      if (errorMsg.includes("zaten mevcut")) {
        const newId = await suggestListingId();
        set("listingId", newId);
        setMessage(`İlan numarası çakışması! Otomatik olarak yeni numara atandı: ${newId}. Tekrar kaydetmeyi deneyin.`);
      }
    }
  }

  const steps = [
    { icon: "info" as AdminIconName, label: "Temel Bilgiler" },
    { icon: "map" as AdminIconName, label: "Konum" },
    { icon: "home" as AdminIconName, label: "Özellikler" },
    { icon: "photo_library" as AdminIconName, label: "Medya" },
    { icon: "person" as AdminIconName, label: "Danışman & Yayın" },
    { icon: "settings" as AdminIconName, label: "101evler" },
    { icon: "settings" as AdminIconName, label: "Hangiev" },
  ];

  return (
    <div className="space-y-8 pb-28">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold md:text-3xl">{listing ? "İlan Düzenle" : "Yeni İlan Oluştur"}</h1>
          <p className="mt-1 text-sm text-zinc-500">Adımları takip ederek ilanınızı oluşturun</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/ilan/${form.listingId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            Önizleme
          </a>
          <button
            type="button"
            onClick={saveDraft}
            disabled={pending || uploadBusy}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 disabled:opacity-50"
          >
            Taslak Kaydet
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={pending || uploadBusy}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-emerald-600/25 disabled:opacity-50 hover:bg-emerald-700"
          >
            {viewerRole === "ADMIN" ? "Yayınla" : "Admin Onayına Gönder"}
          </button>
        </div>
      </div>

      {uploadHint && <p className="text-sm font-medium text-emerald-600">{uploadHint}</p>}
      {message && messageType === "success" && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
          <p className="text-sm font-semibold text-emerald-800">{message}</p>
          <p className="text-xs text-emerald-600 mt-1">İlanlar sayfasına yönlendiriliyorsunuz...</p>
        </div>
      )}
      {message && messageType === "error" && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <p className="text-sm font-semibold text-red-800">{message}</p>
        </div>
      )}

      {/* Progress */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Adım {wizardStep + 1} / {steps.length}
          </span>
          <span className="text-xs font-semibold text-zinc-400">
            {Math.round(((wizardStep + 1) / steps.length) * 100)}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${((wizardStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Navigation */}
      <nav className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-1.5">
        {steps.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setWizardStep(i)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              wizardStep === i
                ? "bg-emerald-600 text-white shadow-md"
                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
            }`}
          >
            <AdminIcon name={s.icon} size={18} />
            <span className="hidden sm:inline">{s.label}</span>
            <span className="inline sm:hidden text-xs">{i + 1}</span>
          </button>
        ))}
      </nav>

      {/* STEP 0: Temel Bilgiler */}
      {wizardStep === 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-800">Temel Bilgiler</h2>
          <p className="mt-1 text-sm text-zinc-500">İlanın temel bilgilerini girin</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-zinc-700">
              İlan No
              <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.listingId} onChange={(e) => set("listingId", e.target.value)} />
              <span className="mt-1 block text-xs text-zinc-400">Otomatik oluşturulur, değiştirebilirsiniz</span>
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              Başlık
              <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.title} onChange={(e) => set("title", e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              İlan Türü
              <select className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.kind} onChange={(e) => set("kind", e.target.value)}>
                <option value="SATILIK">Satılık</option>
                <option value="KIRALIK">Kiralık</option>
                <option value="GUNLUK_KIRALIK">Günlük Kiralık</option>
                <option value="PROJE">Proje</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              Emlak Tipi
              <select className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.propertyType.toLowerCase()} onChange={(e) => set("propertyType", e.target.value)}>
                <option value="konut">Konut / Daire</option>
                <option value="ticari">Ticari</option>
                <option value="arsa">Arsa / Arazi</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              Fiyat
              <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" inputMode="decimal" value={form.price} onChange={(e) => set("price", e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              Para Birimi
              <select className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                <option value="EUR">EUR (€)</option>
                <option value="TRY">TRY (₺)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-zinc-700 sm:col-span-2">
              Kısa Açıklama
              <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
              <span className="mt-1 block text-xs text-zinc-400">Listeleme sayfalarında görünen kısa açıklama</span>
            </label>
          </div>
        </section>
      )}

      {/* STEP 1: Konum */}
      {wizardStep === 1 && (
        <>
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-800">Konum Bilgileri</h2>
            <p className="mt-1 text-sm text-zinc-500">İlanın konum bilgilerini girin</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-zinc-700">
                Şehir (İlçe)
                <select
                  className={LOCATION_SELECT_CLASS}
                  value={form.city}
                  onChange={(e) => {
                    const newCity = e.target.value;
                    setForm((f) => {
                      const next = { ...f, city: newCity, region: "" };
                      return {
                        ...next,
                        ...(next.exportTo101evler
                          ? { ext101_area_city: infer101AreaCity(newCity), ext101_area_id: "" }
                          : {}),
                        ...(next.exportToHangiev
                          ? { hangiev_area_city: inferHangievAreaCity(newCity), hangiev_area_id: "" }
                          : {}),
                      };
                    });
                  }}
                >
                  {kktcCities.map((c) => (
                    <option key={c.v} value={c.v}>{c.l}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-zinc-700">
                Bölge / Mahalle
                {form.city && kktcRegions[form.city]?.length > 0 ? (
                  <select
                    className={LOCATION_SELECT_CLASS}
                    value={form.region}
                    onChange={(e) => {
                      const newRegion = e.target.value;
                      setForm((f) => {
                        const next = { ...f, region: newRegion };
                        return {
                          ...next,
                          ...(next.exportTo101evler
                            ? {
                                ext101_area_city: infer101AreaCity(next.city),
                                ext101_area_id: infer101AreaId(next.city, newRegion),
                              }
                            : {}),
                          ...(next.exportToHangiev
                            ? {
                                hangiev_area_city: inferHangievAreaCity(next.city),
                                hangiev_area_id: inferHangievAreaId(next.city, newRegion),
                              }
                            : {}),
                        };
                      });
                    }}
                  >
                    <option value="">Seçiniz</option>
                    {kktcRegions[form.city].map((r) => (
                      <option key={r.v} value={r.v}>{r.l}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Örn: Esentepe, Koru Mevkii"
                    value={form.region}
                    onChange={(e) => {
                      const newRegion = e.target.value;
                      setForm((f) => {
                        const next = { ...f, region: newRegion };
                        return {
                          ...next,
                          ...(next.exportTo101evler
                            ? {
                                ext101_area_city: infer101AreaCity(next.city),
                                ext101_area_id: infer101AreaId(next.city, newRegion),
                              }
                            : {}),
                          ...(next.exportToHangiev
                            ? {
                                hangiev_area_city: inferHangievAreaCity(next.city),
                                hangiev_area_id: inferHangievAreaId(next.city, newRegion),
                              }
                            : {}),
                        };
                      });
                    }}
                  />
                )}
                <span className="mt-1 block text-xs text-zinc-400">Şehir şeçtikten sonra bölgeyi listeden seçin veya yazın</span>
              </label>
              <label className="block text-sm font-medium text-zinc-700 sm:col-span-2">
                Açık Adres
                <textarea
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 min-h-[80px]"
                  placeholder="Sokak, bina no, kat, daire..."
                  value={form.fullAddress}
                  onChange={(e) => set("fullAddress", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-800">Haritadan Konum Seçin</h2>
            <p className="mt-1 text-sm text-zinc-500">Haritada bir noktaya tıklayın veya pin sürükleyin, adres otomatik doldurulur</p>
            <div className="mt-4">
              <LocationPicker
                onLocationSelect={handleMapLocationSelect}
                initialLat={previewCoords.lat ?? undefined}
                initialLng={previewCoords.lng ?? undefined}
                focusLat={focusCoords?.lat}
                focusLng={focusCoords?.lng}
                focusZoom={focusCoords?.zoom}
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700">
                Koordinatlar
                <div className="mt-1 flex gap-2">
                  <input
                    className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-mono outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="35.250191, 33.020332"
                    value={form.coordinates}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm((f) => {
                        if (!value.trim()) return { ...f, coordinates: value, mapEnabled: false };
                        const parsed = parseLatLngPair(value);
                        if (parsed?.lat && parsed?.lng) return { ...f, coordinates: value, mapEnabled: true };
                        return { ...f, coordinates: value };
                      });
                    }}
                  />
                </div>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-800">Detaylı Açıklama</h2>
            <p className="mt-1 text-sm text-zinc-500">İlanın detaylı açıklamasını yazın</p>
            <textarea
              className="mt-4 min-h-[140px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm leading-relaxed outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="İlan hakkında detaylı bilgi..."
              value={form.longDescription}
              onChange={(e) => set("longDescription", e.target.value)}
            />
          </section>
        </>
      )}

      {/* STEP 2: Özellikler */}
      {wizardStep === 2 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-800">Emlak Özellikleri</h2>
          <p className="mt-1 text-sm text-zinc-500">Oda sayısı, metrekare ve diğer özellikleri girin</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                { key: "bedrooms", min: 0, max: 20, step: 1, hint: "0-20" },
                { key: "bathrooms", min: 0, max: 10, step: 1, hint: "0-10" },
                { key: "areaM2", min: 0, max: 100000, step: 1, hint: "m²" },
                { key: "plotAreaM2", min: 0, max: 1000000, step: 1, hint: "m²" },
                { key: "floor", min: -5, max: 100, step: 1, hint: "-5 ile 100" },
                { key: "buildingAge", min: 0, max: 120, step: 1, hint: "0-120 (yıl)" },
                { key: "livingRooms", min: 0, max: 10, step: 1, hint: "0-10" },
              ] as const
            ).map(({ key, min, max, step, hint }) => {
              const raw = form[key];
              const num = raw === "" ? null : Number(raw);
              const invalid =
                num !== null && (!Number.isFinite(num) || num < min || num > max);
              return (
                <label key={key} className="block text-sm font-medium text-zinc-700">
                  <span className="flex items-center justify-between">
                    <span>{PROPERTY_LABELS[key]}</span>
                    <span className="text-[11px] font-normal text-zinc-400">{hint}</span>
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={min}
                    max={max}
                    step={step}
                    className={`mt-1 w-full rounded-xl border bg-zinc-50 px-3 py-2 text-sm outline-none focus:ring-2 ${
                      invalid
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-zinc-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                    }`}
                    value={raw}
                    onChange={(e) => set(key, e.target.value)}
                  />
                  {invalid && (
                    <span className="mt-1 block text-xs text-rose-600">
                      Lütfen {min} ile {max} arasında bir değer girin.
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            {([
              ["hasPool", "Havuz"],
              ["hasGarden", "Bahçe"],
              ["hasFireplace", "Şömine"],
              ["hasParking", "Otopark"],
              ["furnished", "Eşyalı"],
              ["seaView", "Deniz Manzarası"],
            ] as const).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500/20" />
                {label}
              </label>
            ))}
          </div>
          <label className="mt-6 block text-sm font-medium text-zinc-700">
            Özellikler / Ekipmanlar
            <textarea
              className="mt-1 min-h-[120px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Her satıra bir özellik yazın&#10;Klima&#10;Merkezi Isıtma&#10;Güvenlik..."
              value={form.featuresText}
              onChange={(e) => set("featuresText", e.target.value)}
            />
          </label>
        </section>
      )}

      {/* STEP 3: Medya */}
      {wizardStep === 3 && (
        <>
          <section className="rounded-2xl border-2 border-dashed border-emerald-300 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-800">Fotoğraflar</h2>
            <p className="mt-1 text-sm text-zinc-500">İlan fotoğraflarını yükleyin</p>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-800">Kapak Fotoğrafı</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className={`inline-flex cursor-pointer items-center justify-center rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-zinc-900 ${uploadBusy ? "pointer-events-none opacity-50" : ""}`}>
                    <input type="file" accept="image/*,.heic,.heif,.avif" className="sr-only" onChange={onCoverFileChange} disabled={uploadBusy} />
                    Kapak Seç
                  </label>
                  {form.coverImage.trim() ? (
                    <div className="relative h-20 w-28 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                      <Image src={form.coverImage.trim()} alt="" fill className="object-cover" sizes="112px" unoptimized />
                    </div>
                  ) : (
                    <span className="text-sm text-zinc-400">Kapak fotoğrafı seçilmedi</span>
                  )}
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-zinc-500 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-700">
                    URL ile kapak ekle
                  </summary>
                  <input className="mt-2 w-full max-w-xl rounded-lg border border-zinc-200 px-3 py-2 text-sm" placeholder="https://..." value={form.coverImage} onChange={(e) => set("coverImage", e.target.value)} />
                </details>
              </div>

              <div>
                <p className="text-sm font-semibold text-zinc-800">Galeri</p>
                <label className={`mt-3 inline-flex cursor-pointer items-center justify-center rounded-lg border-2 border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 ${uploadBusy ? "pointer-events-none opacity-50" : ""}`}>
                  <input type="file" accept="image/*,.heic,.heif,.avif" multiple className="sr-only" onChange={onGalleryFilesChange} disabled={uploadBusy} />
                  {uploadBusy ? "Yükleniyor..." : "Fotoğraf Yükle"}
                </label>

                {gallery.filter((g) => g.url.trim()).length === 0 ? (
                  <p className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-400">Henüz fotoğraf eklenmedi</p>
                ) : (
                  <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {gallery.map((g, idx) => {
                      const url = g.url.trim();
                      if (!url) return null;
                      return (
                        <li key={`${url}-${idx}`} className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 shadow-sm">
                          <div className="relative aspect-4/3 bg-zinc-200">
                            <Image src={url} alt="" fill className="object-cover" sizes="(max-width:640px) 50vw, 25vw" unoptimized />
                            {g.isPrimary && (
                              <span className="absolute left-2 top-2 rounded bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">Kapak</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 p-2">
                            <button type="button" className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-100 disabled:opacity-40" disabled={idx === 0} onClick={() => moveGallery(idx, -1)}>↑</button>
                            <button type="button" className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-100 disabled:opacity-40" disabled={idx >= gallery.length - 1} onClick={() => moveGallery(idx, 1)}>↓</button>
                            <button type="button" className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-100" onClick={() => makeGalleryPrimary(idx)}>Kapak Yap</button>
                            <button type="button" className="ml-auto rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50" onClick={() => removeGalleryRow(idx)}>Sil</button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-800">Video & Sanal Tur</h2>
            <p className="mt-1 text-sm text-zinc-500">Video ve 3D tur bağlantılarını ekleyin</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.virtualTourEnabled} onChange={(e) => set("virtualTourEnabled", e.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500/20" />
                Sanal Tur Aktif
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.videoEnabled} onChange={(e) => set("videoEnabled", e.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500/20" />
                Video Aktif
              </label>
              <input className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" placeholder="Sanal Tur URL" value={form.virtualTourUrl} onChange={(e) => set("virtualTourUrl", e.target.value)} />
              <input className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" placeholder="Video URL (YouTube, Vimeo...)" value={form.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} />
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-800">Yakındaki Yerler</h2>
            <p className="mt-1 text-sm text-zinc-500">Yakındaki önemli noktaları seçin</p>
            <label className="mt-3 flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={form.nearbyEnabled} onChange={(e) => set("nearbyEnabled", e.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500/20" />
              Yakındaki yerleri göster
            </label>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {NEARBY_POI_CATEGORIES.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-start gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500/20" checked={form.poiCategories[c.id]} onChange={() => togglePoiCategory(c.id)} />
                  <span className="font-medium text-zinc-700">{c.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 p-4">
              <p className="text-sm font-semibold text-emerald-800">Önizleme</p>
              <NearbyPoiAdminPreview lat={previewCoords.lat} lng={previewCoords.lng} categories={form.poiCategories} />
            </div>
          </section>
        </>
      )}

      {/* STEP 4: Danışman & Yayın */}
      {wizardStep === 4 && (
        <>
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-800">Danışman Bilgileri</h2>
            <p className="mt-1 text-sm text-zinc-500">Kayıtlı danışmandan seçin veya manuel girin</p>
            
            {agents && agents.length > 0 && (
              <label className="mt-4 block text-sm font-medium text-zinc-700">
                Kayıtlı Danışman Seç
                <select
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  value={form.selectedAgentId}
                  onChange={(e) => handleAgentSelect(e.target.value)}
                >
                  <option value="">— Manuel Giriş —</option>
                  {agents.filter(a => a.is_active ?? true).map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.title || "Danışman"})</option>
                  ))}
                </select>
              </label>
            )}
            
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-zinc-700">
                {CONSULTANT_LABELS.consultantName}
                <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.consultantName} onChange={(e) => set("consultantName", e.target.value)} />
              </label>
              <label className="block text-sm font-medium text-zinc-700">
                {CONSULTANT_LABELS.consultantPhone}
                <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.consultantPhone} onChange={(e) => set("consultantPhone", e.target.value)} />
              </label>
              <label className="block text-sm font-medium text-zinc-700">
                {CONSULTANT_LABELS.consultantWhatsapp}
                <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.consultantWhatsapp} onChange={(e) => set("consultantWhatsapp", e.target.value)} />
              </label>
              <label className="block text-sm font-medium text-zinc-700">
                {CONSULTANT_LABELS.consultantEmail}
                <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.consultantEmail} onChange={(e) => set("consultantEmail", e.target.value)} />
              </label>
              <label className="block text-sm font-medium text-zinc-700">
                {CONSULTANT_LABELS.consultantOffice}
                <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.consultantOffice} onChange={(e) => set("consultantOffice", e.target.value)} />
              </label>
              
              {/* Danışman Fotoğraf Yükleme */}
              <label className="block text-sm font-medium text-zinc-700">
                {CONSULTANT_LABELS.consultantPhoto}
                <div className="mt-1 flex gap-2">
                  <input className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.consultantPhoto} onChange={(e) => set("consultantPhoto", e.target.value)} placeholder="veya URL girin" />
                  <label className="cursor-pointer rounded-xl bg-zinc-800 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-900">
                    <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await postUploadFile(file);
                        set("consultantPhoto", url);
                      } catch (err) {
                        setMessage(err instanceof Error ? err.message : "Yükleme hatası");
                      }
                    }} />
                    Yükle
                  </label>
                </div>
                {form.consultantPhoto && (
                  <div className="mt-2 relative h-16 w-16 rounded-lg overflow-hidden border border-zinc-200">
                    <Image src={form.consultantPhoto} alt="" fill className="object-cover" sizes="64px" unoptimized />
                  </div>
                )}
              </label>

              {/* Ofis Logo Yükleme */}
              <label className="block text-sm font-medium text-zinc-700">
                {CONSULTANT_LABELS.consultantOfficeLogo}
                <div className="mt-1 flex gap-2">
                  <input className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.consultantOfficeLogo} onChange={(e) => set("consultantOfficeLogo", e.target.value)} placeholder="veya URL girin" />
                  <label className="cursor-pointer rounded-xl bg-zinc-800 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-900">
                    <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await postUploadFile(file);
                        set("consultantOfficeLogo", url);
                      } catch (err) {
                        setMessage(err instanceof Error ? err.message : "Yükleme hatası");
                      }
                    }} />
                    Yükle
                  </label>
                </div>
                {form.consultantOfficeLogo && (
                  <div className="mt-2 relative h-16 w-16 rounded-lg overflow-hidden border border-zinc-200">
                    <Image src={form.consultantOfficeLogo} alt="" fill className="object-cover" sizes="64px" unoptimized />
                  </div>
                )}
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-800">Etiketler</h2>
            <p className="mt-1 text-sm text-zinc-500">İlan üzerinde görünecek etiketleri seçin</p>
            <div className="mt-3 flex flex-wrap gap-4">
              {([
                ["badgeFeatured", "Öne Çıkan"],
                ["badgeExclusive", "Özel"],
                ["badgeVirtualTour", "Sanal Tur"],
                ["badgeVideo", "Video"],
                ["badgeNew", "Yeni"],
                ["badgePriceDrop", "Fiyat Düştü"],
              ] as const).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500/20" />
                  {label}
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-800">Çoklu Dil Desteği</h2>
            <p className="mt-1 text-sm text-zinc-500">Diğer dillerde başlık ve açıklama ekleyin</p>
            <div className="mt-4 grid gap-6">
              {["en", "ru", "de", "fa"].map((lang) => (
                <div key={lang} className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
                    <span className="text-xs font-bold uppercase text-emerald-700">{lang}</span>
                    <span className="text-xs text-zinc-400">
                      {lang === "en" ? "English" : lang === "ru" ? "Русский" : lang === "de" ? "Deutsch" : "فارسی"}
                    </span>
                  </div>
                  <div className="grid gap-3">
                    <label className="block text-xs font-medium text-zinc-500">
                      Başlık
                      <input className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-emerald-500" value={translations[lang]?.title || ""} onChange={(e) => setTranslation(lang, "title", e.target.value)} />
                    </label>
                    <label className="block text-xs font-medium text-zinc-500">
                      Kısa Açıklama
                      <input className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-emerald-500" value={translations[lang]?.shortDescription || ""} onChange={(e) => setTranslation(lang, "shortDescription", e.target.value)} />
                    </label>
                    <label className="block text-xs font-medium text-zinc-500">
                      Detaylı Açıklama
                      <textarea className="mt-1 min-h-[80px] w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-emerald-500" value={translations[lang]?.longDescription || ""} onChange={(e) => setTranslation(lang, "longDescription", e.target.value)} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {viewerRole === "ADMIN" ? (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-zinc-800">Yayın Durumu</h2>
              <p className="mt-1 text-sm text-zinc-500">İlanın yayın durumunu belirleyin</p>
              <div className="mt-4">
                <label className="block text-sm font-medium text-zinc-700">
                  Durum
                  <select className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.publishStatus} onChange={(e) => set("publishStatus", e.target.value)}>
                    <option value="DRAFT">Taslak</option>
                    <option value="PUBLISHED">Yayında</option>
                    <option value="HIDDEN">Gizli</option>
                  </select>
                </label>
              </div>
            </section>
          ) : null}
        </>
      )}

      {/* STEP 5: 101evler XML Yayını */}
      {wizardStep === 5 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-800">101evler XML Yayını</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Bu ilanı 101evler.com üzerinde yayınlamak için aşağıdaki bilgileri eksiksiz doldurun.
            <code>type_id</code> ve <code>area_id</code> zorunludur, eksikse ilan feed&apos;e dahil edilmez.
          </p>

          <label className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.exportTo101evler}
              onChange={(e) => setExportTo101evler(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500/20"
            />
            <span className="font-semibold text-emerald-800">Bu ilanı 101evler&apos;e gönder</span>
          </label>

          <fieldset disabled={!form.exportTo101evler} className={form.exportTo101evler ? "" : "opacity-60"}>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
              <p className="text-zinc-600">
                Sistem; emlak tipi, şehir/bölge, oda sayısı, bina yaşı ve eşya durumundan 101evler ID&apos;lerini otomatik önerir.
              </p>
              <button
                type="button"
                onClick={refresh101Defaults}
                className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
              >
                Bilgilerden otomatik doldur
              </button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-zinc-700">
                İlan Tipi (type_id) *
                <select
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  value={form.ext101_type_id}
                  onChange={(e) => set("ext101_type_id", e.target.value)}
                >
                  <option value="">— Seçiniz —</option>
                  {TYPE_ID_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.id} — {o.label}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-zinc-700">
                Şehir (area filtresi)
                <select
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  value={form.ext101_area_city}
                  onChange={(e) => set("ext101_area_city", e.target.value)}
                >
                  <option value="">— Tümü —</option>
                  {Object.keys(AREA_ID_OPTIONS).map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-zinc-700 sm:col-span-2">
                Bölge (area_id) *
                <select
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  value={form.ext101_area_id}
                  onChange={(e) => set("ext101_area_id", e.target.value)}
                >
                  <option value="">— Seçiniz —</option>
                  {(form.ext101_area_city
                    ? AREA_ID_OPTIONS[form.ext101_area_city] ?? []
                    : Object.entries(AREA_ID_OPTIONS).flatMap(([c, opts]) => opts.map((o) => ({ ...o, label: `${c} — ${o.label}` })))
                  ).map((o) => (
                    <option key={o.id} value={o.id}>{o.id} — {o.label}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-zinc-700">
                Koçan Türü (title_type_id)
                <select
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  value={form.ext101_title_type_id}
                  onChange={(e) => set("ext101_title_type_id", e.target.value)}
                >
                  <option value="">—</option>
                  {TITLE_TYPE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-zinc-700">
                Oda Sayısı (room_count_id)
                <select
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  value={form.ext101_room_count_id}
                  onChange={(e) => set("ext101_room_count_id", e.target.value)}
                >
                  <option value="">—</option>
                  {ROOM_COUNT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-zinc-700">
                Bina Yaşı (build_age_id)
                <select
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  value={form.ext101_build_age_id}
                  onChange={(e) => set("ext101_build_age_id", e.target.value)}
                >
                  <option value="">—</option>
                  {BUILD_AGE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-zinc-700">
                Eşya Durumu (furnishing_id)
                <select
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  value={form.ext101_furnishing_id}
                  onChange={(e) => set("ext101_furnishing_id", e.target.value)}
                >
                  <option value="">—</option>
                  {FURNISHING_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </label>

              {(form.kind === "KIRALIK" || form.kind === "GUNLUK_KIRALIK") && (
                <label className="block text-sm font-medium text-zinc-700">
                  Kira Ödeme Dönemi (billing_cycle_id)
                  <select
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    value={form.ext101_billing_cycle_id}
                    onChange={(e) => set("ext101_billing_cycle_id", e.target.value)}
                  >
                    <option value="">—</option>
                    {BILLING_CYCLE_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block text-sm font-medium text-zinc-700">
                Fiyat Tipi (price_for)
                <div className="mt-1 flex gap-3">
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      name="ext101_price_for"
                      value="T"
                      checked={form.ext101_price_for === "T"}
                      onChange={() => set("ext101_price_for", "T")}
                    />
                    Toplam
                  </label>
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      name="ext101_price_for"
                      value="U"
                      checked={form.ext101_price_for === "U"}
                      onChange={() => set("ext101_price_for", "U")}
                    />
                    Birim (m²)
                  </label>
                </div>
              </label>

              <label className="block text-sm font-medium text-zinc-700">
                Referans No (reference_no)
                <input
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="Boş bırakılırsa İlan No kullanılır"
                  value={form.ext101_reference_no}
                  onChange={(e) => set("ext101_reference_no", e.target.value)}
                />
              </label>
            </div>
          </fieldset>

          <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800">
            <p className="font-semibold">Not</p>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              <li>İlan 101evler&apos;e gitmesi için <strong>Yayın Durumu = Yayında</strong> olmalı.</li>
              <li>Para birimi sadece TRY ve USD desteklenir; EUR/GBP ilanlar feed&apos;e girmez (101evler kur kodları teyit edildiğinde eklenecek).</li>
              <li>type_id veya area_id boş olan ilanlar feed&apos;den otomatik düşer.</li>
            </ul>
          </div>
        </section>
      )}

      {/* STEP 6: Hangiev XML Yayını */}
      {wizardStep === 6 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-800">Hangiev XML Yayını</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Bu ilanı Hangiev.com üzerinde yayınlamak için aşağıdaki bilgileri eksiksiz doldurun.
            <code>property_type_id</code> ve <code>area_id</code> zorunludur, eksikse ilan feed&apos;e dahil edilmez.
          </p>

          <label className="mt-4 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50/50 px-4 py-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.exportToHangiev}
              onChange={(e) => setExportToHangiev(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500/20"
            />
            <span className="font-semibold text-sky-800">Bu ilanı Hangiev&apos;e gönder</span>
          </label>

          <fieldset disabled={!form.exportToHangiev} className={form.exportToHangiev ? "" : "opacity-60"}>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
              <p className="text-zinc-600">
                Sistem; emlak tipi, şehir/bölge, oda sayısı, bina yaşı ve eşya durumundan Hangiev ID&apos;lerini otomatik önerir.
              </p>
              <button
                type="button"
                onClick={refreshHangievDefaults}
                className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-50"
              >
                Bilgilerden otomatik doldur
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-zinc-700">
                Emlak Tipi (property_type_id) *
                <select
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  value={form.hangiev_property_type_id}
                  onChange={(e) => set("hangiev_property_type_id", e.target.value)}
                >
                  <option value="">- Seçiniz -</option>
                  {HANGIEV_PROPERTY_TYPE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.id} - {o.label}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-zinc-700">
                Şehir (area filtresi)
                <select
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  value={form.hangiev_area_city}
                  onChange={(e) => set("hangiev_area_city", e.target.value)}
                >
                  <option value="">- Tümü -</option>
                  {Object.keys(HANGIEV_AREA_ID_OPTIONS).map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-zinc-700 sm:col-span-2">
                Bölge (area_id) *
                <select
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  value={form.hangiev_area_id}
                  onChange={(e) => set("hangiev_area_id", e.target.value)}
                >
                  <option value="">- Seçiniz -</option>
                  {(form.hangiev_area_city
                    ? HANGIEV_AREA_ID_OPTIONS[form.hangiev_area_city] ?? []
                    : Object.entries(HANGIEV_AREA_ID_OPTIONS).flatMap(([c, opts]) => opts.map((o) => ({ ...o, label: `${c} - ${o.label}` })))
                  ).map((o) => (
                    <option key={o.id} value={o.id}>{o.id} - {o.label}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-zinc-700">
                Oda Sayısı (room_count_id)
                <select
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  value={form.hangiev_room_count_id}
                  onChange={(e) => set("hangiev_room_count_id", e.target.value)}
                >
                  <option value="">-</option>
                  {HANGIEV_ROOM_COUNT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-zinc-700">
                Bina Yaşı (build_age_id)
                <select
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  value={form.hangiev_build_age_id}
                  onChange={(e) => set("hangiev_build_age_id", e.target.value)}
                >
                  <option value="">-</option>
                  {HANGIEV_BUILD_AGE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-zinc-700">
                Eşya Durumu (furnishing_id)
                <select
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  value={form.hangiev_furnishing_id}
                  onChange={(e) => set("hangiev_furnishing_id", e.target.value)}
                >
                  <option value="">-</option>
                  {HANGIEV_FURNISHING_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-zinc-700">
                Fiyat Tipi (price_for)
                <div className="mt-1 flex gap-3">
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      name="hangiev_price_for"
                      value="T"
                      checked={form.hangiev_price_for === "T"}
                      onChange={() => set("hangiev_price_for", "T")}
                    />
                    Toplam
                  </label>
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      name="hangiev_price_for"
                      value="U"
                      checked={form.hangiev_price_for === "U"}
                      onChange={() => set("hangiev_price_for", "U")}
                    />
                    Birim (m²)
                  </label>
                </div>
              </label>

              <label className="block text-sm font-medium text-zinc-700">
                Referans No (reference_no)
                <input
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  placeholder="Boş bırakılırsa İlan No kullanılır"
                  value={form.hangiev_reference_no}
                  onChange={(e) => set("hangiev_reference_no", e.target.value)}
                />
              </label>
            </div>
          </fieldset>

          <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-800">
            <p className="font-semibold">Not</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>İlan Hangiev&apos;e gitmesi için <strong>Yayın Durumu = Yayında</strong> olmalı.</li>
              <li>Hangiev XML şeması doküman gelene kadar 101evler benzeri geçici formatla üretilir.</li>
              <li>property_type_id veya area_id boş olan ilanlar feed&apos;den otomatik düşer.</li>
            </ul>
          </div>
        </section>
      )}

      {/* Prev/Next */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={wizardStep === 0}
          onClick={() => setWizardStep((s) => Math.max(0, s - 1))}
          className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-30"
        >
          <AdminIcon name="arrow_back" size={18} />
          Önceki
        </button>
        <span className="text-xs font-medium text-zinc-400">
          Adım {wizardStep + 1} / {steps.length}
        </span>
        <button
          type="button"
          disabled={wizardStep === steps.length - 1}
          onClick={() => setWizardStep((s) => Math.min(steps.length - 1, s + 1))}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-700 disabled:opacity-30"
        >
          Sonraki
          <AdminIcon name="arrow_forward" size={18} />
        </button>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-wrap items-center justify-center gap-2 border-t border-zinc-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-md lg:left-64">
        <span className="hidden text-xs text-zinc-400 sm:inline">Kaydetmeyi unutmayın!</span>
        <button type="button" onClick={saveDraft} disabled={pending || uploadBusy} className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 disabled:opacity-50">
          Taslak Kaydet
        </button>
        <button type="button" onClick={publish} disabled={pending || uploadBusy} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-emerald-600/25 disabled:opacity-50 hover:bg-emerald-700">
          {viewerRole === "ADMIN" ? "Yayınla" : "Admin Onayına Gönder"}
        </button>
      </div>
    </div>
  );
}
