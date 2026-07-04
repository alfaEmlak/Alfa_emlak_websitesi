"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { Listing, ListingImage } from "@prisma/client";
import { saveListing, suggestListingId, type ListingSavePayload } from "@/app/karealfaadmin/actions";
import { kktcCities, kktcRegions, kktcCityCoords, kktcRegionCoords } from "@/lib/kktc-regions";
import RichTextEditor from "@/components/admin/RichTextEditor";
import {
  NEARBY_POI_CATEGORIES,
  parseNearbyPoiCategoriesJson,
  serializeNearbyPoiCategoriesJson,
  type NearbyPoiCategoryId,
} from "@/lib/nearby-poi";
import { normalizeListingCitySlug } from "@/lib/listing-city";
import {
  formatListingPropertyType,
  LISTING_CATEGORY_KEYS,
  LISTING_SUBTYPE_MAP,
  parseListingPropertyType,
  propertyTypeForFeedLookup,
  type ListingCategoryKey,
} from "@/lib/listing-property-taxonomy";
import {
  mergeDetailFieldsWithOwnerAndPreset,
  parseOwnerContactPrivate,
} from "@/lib/owner-contact-private";
import { parseLatLngPair, parseNearby, parseStringArray } from "@/lib/listing-utils";
import { TITLE_DEED_OWNERSHIP_OPTIONS, parseTitleDeedOwnership } from "@/lib/title-deed-ownership";
import {
  LAND_LOCATION_TAG_DEFS,
  emptyLandTags,
  mergeLandParcelDetailFields,
  parseLandFieldsFromDetailFields,
} from "@/lib/land-parcel-detail";
import {
  FLOOR_BASEMENT_CANONICAL,
  FLOOR_GROUND_CANONICAL,
  isBasementFloorStored,
  isGroundFloorStored,
  isPresetFloorChoiceStored,
  normalizeFloorFromListing,
} from "@/lib/floor-field";
import {
  TICARI_TAG_DEFS,
  emptyTicariTags,
  mergeCommercialDetailFields,
  parseTicariTagsFromDetailFields,
} from "@/lib/commercial-parcel-detail";
import {
  mergeOwnedFloorsDetailFields,
  OWNED_FLOORS_LAYOUT_KEYS,
  parseOwnedFloorsFromDetailFields,
} from "@/lib/owned-floors-detail";
import { type FeedLookups, type LookupOption, groupAreasByCity } from "@/lib/feeds/lookup-types";
import { AdminIcon, type AdminIconName } from "@/components/admin/AdminIcon";
import { NearbyPoiAdminPreview } from "@/components/admin/NearbyPoiAdminPreview";
import dynamic from "next/dynamic";
import { GripVertical } from "lucide-react";
import { nanoid } from "nanoid";
import { useTranslations } from "next-intl";

const LocationPicker = dynamic(() => import("@/components/admin/LocationPicker"), { ssr: false });

const LOCATION_SELECT_CLASS =
  "mt-1 w-full rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/20";

type GalleryRow = { nid: string; url: string; sortOrder: number; isPrimary: boolean };

type SavedGalleryRow = Pick<GalleryRow, "url" | "sortOrder" | "isPrimary">;

/** HTML5 drag — galeri satır sırası (ListingEditor) */
const GALLERY_DND_PAYLOAD = "application/x-alfa-gallery-idx";

const LIKELY_IMAGE_EXT = /\.(jpe?g|jfif|png|gif|webp|bmp|heic|heif|avif|tif{1,2})$/i;

function isSelectableImageFile(f: File): boolean {
  const t = (f.type || "").trim().toLowerCase();
  if (t.startsWith("image/")) return true;
  if ((t === "" || t === "application/octet-stream") && LIKELY_IMAGE_EXT.test(f.name)) return true;
  return false;
}

/** Wizard basics step: sıfırdan büyük geçerli fiyat */
function wizardPricePositive(raw: string): boolean {
  const t = raw.trim().replace(/\s/g, "");
  if (!t) return false;
  const nSimple = Number(t);
  if (Number.isFinite(nSimple) && nSimple > 0) return true;
  if (t.includes(",")) {
    const n = Number(t.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) && n > 0;
  }
  const dots = t.match(/\./g);
  if (dots && dots.length > 1) {
    const n = Number(t.replace(/\./g, ""));
    return Number.isFinite(n) && n > 0;
  }
  return false;
}

function wizardBasicsStepComplete(f: {
  listingId: string;
  title: string;
  kind: string;
  propertyCategory: string;
  propertySubtypeKey: string;
  price: string;
  currency: string;
}): boolean {
  return (
    f.listingId.trim().length > 0 &&
    f.title.trim().length > 0 &&
    f.kind.trim().length > 0 &&
    f.propertyCategory.trim().length > 0 &&
    f.propertySubtypeKey.trim().length > 0 &&
    wizardPricePositive(f.price) &&
    f.currency.trim().length > 0
  );
}

/** Sihirbazda adım sırası: 5 = mal sahibi (`stepOwner`), sonrası danışman / yayın seçenekleri */
const WIZARD_OWNER_STEP_INDEX = 5;

function wizardOwnerStepComplete(f: {
  ownerFirstName: string;
  ownerLastName: string;
  ownerPhone: string;
}): boolean {
  return (
    f.ownerFirstName.trim().length > 0 &&
    f.ownerLastName.trim().length > 0 &&
    f.ownerPhone.trim().length > 0
  );
}

function floorDropdownValue(stored: string): string {
  const normalized = normalizeFloorFromListing(stored).trim();
  if (!normalized) return "";
  if (isBasementFloorStored(normalized)) return FLOOR_BASEMENT_CANONICAL;
  if (isGroundFloorStored(normalized)) return FLOOR_GROUND_CANONICAL;
  if (/^\d+$/.test(normalized)) {
    const n = Number(normalized);
    if (n >= 1 && n <= 20) return String(n);
  }
  return normalized;
}

/** 1–20 / zemin / bodrum dışında kalan mevcut DB değeri (ekstra option) */
function legacyFloorOutsideDropdown(stored: string): string | null {
  const normalized = normalizeFloorFromListing(stored).trim();
  if (!normalized) return null;
  if (isBasementFloorStored(normalized) || isGroundFloorStored(normalized)) return null;
  if (/^\d+$/.test(normalized)) {
    const n = Number(normalized);
    if (n >= 1 && n <= 20) return null;
  }
  return normalized;
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
        titleDeedOwnership?: string | null;
        title_deed_ownership?: string | null;
      })
    | null;
  suggestedId: string;
  agents?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    whatsapp: string | null;
    photo: string | null;
    title: string | null;
    is_active?: boolean;
  }[];
  viewerRole: "ADMIN" | "CONSULTANT";
  lookups: FeedLookups;
  fixedOfficeName: string;
  fixedOfficeLogo: string;
  lockedConsultant?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    whatsapp: string | null;
    photo: string | null;
  } | null;
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
  const label = propertyTypeForFeedLookup(propertyType);
  const key = label.trim().toLocaleLowerCase("tr-TR");
  if (!key) return "";
  if (key === "arsa") return findId(options, "Arsa");
  if (key === "ticari") return findId(options, "İş Yeri");
  if (key === "konut") return findId(options, "Daire");
  if (key === "proje") return findId(options, "Proje");
  return findId(options, label);
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

type BuildingAgePreset = "" | "zero" | "project";

function parseBuildingAgePresetFromListing(listing: Props["listing"]): BuildingAgePreset {
  if (!listing) return "";
  try {
    const raw = listing.detailFields;
    let o: { buildingAgePreset?: unknown };
    if (typeof raw === "string" && raw.trim()) {
      o = JSON.parse(raw) as { buildingAgePreset?: unknown };
    } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      o = raw as { buildingAgePreset?: unknown };
    } else {
      o = {};
    }
    if (o.buildingAgePreset === "project" || o.buildingAgePreset === "zero") return o.buildingAgePreset;
  } catch {
    /* ignore */
  }
  if (listing.buildingAge === 0) return "zero";
  return "";
}

function effectiveBuildingAgeString(form: { buildingAgePreset: BuildingAgePreset; buildingAge: string }): string {
  if (form.buildingAgePreset === "project") return "Proje";
  if (form.buildingAgePreset === "zero") return "0";
  return form.buildingAge;
}

function getInitialCity(val?: string | null) {
  return normalizeListingCitySlug(val ?? "");
}

function getInitialRegion(cityVal: string, val?: string | null) {
  if (!val || !cityVal) return "";
  const regions = kktcRegions[cityVal] || [];
  const match = regions.find(r => r.v === val || r.l === val || r.l.toLowerCase() === val.toLowerCase() || r.v.toLowerCase() === val.toLowerCase());
  return match ? match.v : val;
}

export function ListingEditor({
  listing,
  suggestedId,
  agents,
  viewerRole,
  lookups,
  fixedOfficeName,
  fixedOfficeLogo,
  lockedConsultant = null,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("Wizard");
  const th = useTranslations("HeroSearch");
  const tp = useTranslations("Panel");
  const router = useRouter();

  const postUploadFile = useCallback(
    async (file: File): Promise<string> => {
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
          text ? tp("listingEditor.uploadServerResponse", { status: res.status, text }) : tp("listingEditor.uploadHttpFail", { status: res.status }),
        );
      }
      if (!res.ok) throw new Error(data.error ?? tp("common.uploadFailed"));
      if (!data.url) throw new Error(tp("listingEditor.uploadNoUrl"));
      return data.url;
    },
    [tp],
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  /** Temel bilgiler / mal sahibi uyarısı: koşul sağlanınca efekt ile sıfırlanır */
  const [wizardNavBlock, setWizardNavBlock] = useState<null | "basics" | "owner">(null);

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
    toilets: t("propertyLabels.toilets"),
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
    const sorted = [...listing.images].sort((a, b) => a.sortOrder - b.sortOrder);
    const pi = sorted.findIndex((im) => im.isPrimary);
    /** Eski kayıtta kapak listenin başında olmayabilir; kapak satırını öne taşı */
    const ordered =
      pi > 0 ? [sorted[pi]!, ...sorted.filter((_, i) => i !== pi)] : sorted;
    return ordered.map((im, i) => ({
      nid: nanoid(),
      url: im.url,
      sortOrder: i,
      isPrimary: i === 0,
    }));
  }, [listing]);

  const [gallery, setGallery] = useState<GalleryRow[]>(initialGallery);
  const [galleryDraggingIdx, setGalleryDraggingIdx] = useState<number | null>(null);
  const [galleryDragOverIdx, setGalleryDragOverIdx] = useState<number | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [aiShortBusy, setAiShortBusy] = useState(false);
  const [aiLongBusy, setAiLongBusy] = useState(false);

  async function generateAiDescription(mode: "short" | "long") {
    const setBusy = mode === "short" ? setAiShortBusy : setAiLongBusy;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/ai-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          title: form.title,
          kind: form.kind,
          propertyCategory: form.propertyCategory,
          city: form.city,
          region: form.region,
          bedrooms: form.bedrooms,
          bathrooms: form.bathrooms,
          squareMeters: form.squareMeters,
          price: form.price,
          currency: form.currency,
          currentShort: form.shortDescription,
          currentLong: form.longDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI hatası");
      if (mode === "short") {
        set("shortDescription", data.text);
      } else {
        set("longDescription", data.text);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "AI açıklama üretilemedi");
      setMessageType("error");
    } finally {
      setBusy(false);
    }
  }
  const [uploadHint, setUploadHint] = useState("");
  const [ownerDocUploadBusy, setOwnerDocUploadBusy] = useState(false);

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

  const initialBuildingAgePreset = parseBuildingAgePresetFromListing(listing);
  const initialBuildingAgeStr =
    initialBuildingAgePreset === "project" || initialBuildingAgePreset === "zero"
      ? ""
      : listing?.buildingAge != null
        ? String(listing.buildingAge)
        : "";
  const consultantLocked = viewerRole === "CONSULTANT" || !!lockedConsultant;

  const initialOwnerContact = parseOwnerContactPrivate(listing?.detailFields);
  const initialLand = parseLandFieldsFromDetailFields(listing?.detailFields);
  const initialTicariTags = parseTicariTagsFromDetailFields(listing?.detailFields);
  const initialOwnedFloors = parseOwnedFloorsFromDetailFields(listing?.detailFields);

  // roomType: detailFields'dan oku, yoksa bedrooms+livingRooms'tan infer et
  const initialRoomType = (() => {
    try {
      const raw = listing?.detailFields;
      let o: Record<string, unknown> = {};
      if (typeof raw === "string" && raw.trim()) o = JSON.parse(raw) as Record<string, unknown>;
      else if (raw && typeof raw === "object" && !Array.isArray(raw)) o = raw as Record<string, unknown>;
      const rt = (o as { roomType?: { value?: string } }).roomType;
      if (rt && typeof rt === "object" && typeof rt.value === "string" && rt.value.trim()) return rt.value.trim();
    } catch { /* ignore */ }
    // Fallback: bedrooms + livingRooms'tan oluştur
    const b = listing?.bedrooms;
    const l = listing?.livingRooms;
    if (b != null && l != null) return `${b}+${l}`;
    return "";
  })();
  const initialTaxonomy = parseListingPropertyType(listing?.propertyType ?? null);
  const initialPropertyType =
    listing?.propertyType?.trim() ||
    formatListingPropertyType(
      initialTaxonomy.category,
      initialTaxonomy.subtypeKey || (initialTaxonomy.category === "konut" ? "daire" : ""),
    );

  const [form, setForm] = useState({
    listingId: listing?.listingId ?? suggestedId,
    title: listing?.title ?? "",
    kind: listing?.kind ?? "SATILIK",
    propertyCategory: initialTaxonomy.category,
    propertySubtypeKey: initialTaxonomy.subtypeKey,
    propertyType: initialPropertyType,
    price: listing != null ? String(listing.price) : "",
    currency: listing?.currency ?? "GBP",
    shortDescription: listing?.shortDescription ?? "",
    city: initialCity,
    region: initialRegion,
    neighborhood: "",
    fullAddress: listing?.fullAddress ?? "",
    longDescription: listing?.longDescription ?? "",
    bedrooms: listing?.bedrooms != null ? String(listing.bedrooms) : "",
    bathrooms: listing?.bathrooms != null ? String(listing.bathrooms) : "",
    toilets: listing?.toilets != null ? String(listing.toilets) : "",
    areaM2: listing?.areaM2 != null ? String(listing.areaM2) : "",
    plotAreaM2: listing?.plotAreaM2 != null ? String(listing.plotAreaM2) : "",
    floor: normalizeFloorFromListing(listing?.floor ?? ""),
    buildingAgePreset: initialBuildingAgePreset,
    buildingAge: initialBuildingAgeStr,
    livingRooms: listing?.livingRooms != null ? String(listing.livingRooms) : "",
    roomType: initialRoomType,
    hasPool: listing?.hasPool ?? false,
    hasGarden: listing?.hasGarden ?? false,
    hasFireplace: listing?.hasFireplace ?? false,
    hasParking: listing?.hasParking ?? false,
    furnished: listing?.furnished ?? false,
    seaView: listing?.seaView ?? false,
    hasElevator: listing?.hasElevator ?? false,
    hasBalcony: listing?.hasBalcony ?? false,
    hasTerrace: listing?.hasTerrace ?? false,
    hasAirConditioning: listing?.hasAirConditioning ?? false,
    hasGatedCommunity: listing?.hasGatedCommunity ?? false,
    titleDeedOwnership: parseTitleDeedOwnership(
      (listing as Record<string, unknown> | null)?.titleDeedOwnership ??
        (listing as Record<string, unknown> | null)?.title_deed_ownership,
    ),
    landImarDurumu: initialLand.imarDurumu,
    landToplamImarOrani: initialLand.toplamImarOrani,
    landTabanOrani: initialLand.tabanOrani,
    landMaxKat: initialLand.maxKat,
    landPricePerDonum: initialLand.pricePerDonum,
    landTags: { ...emptyLandTags(), ...initialLand.tags },
    ticariTags: { ...emptyTicariTags(), ...initialTicariTags },
    ownedFloorsScope: initialOwnedFloors.ownedFloorsScope,
    ownedFloorsLayout: initialOwnedFloors.ownedFloorsLayout,
    ownedFloorsFloorCount: initialOwnedFloors.ownedFloorsFloorCount,
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
    consultantName: lockedConsultant?.name ?? listing?.consultantName ?? "",
    consultantPhone: lockedConsultant?.phone ?? listing?.consultantPhone ?? "",
    consultantWhatsapp: lockedConsultant?.whatsapp ?? listing?.consultantWhatsapp ?? "",
    consultantEmail: lockedConsultant?.email ?? listing?.consultantEmail ?? "",
    consultantOffice: fixedOfficeName,
    consultantPhoto: lockedConsultant?.photo ?? listing?.consultantPhoto ?? "",
    consultantOfficeLogo: fixedOfficeLogo,
    selectedAgentId: lockedConsultant?.id ?? listing?.createdByAgentId ?? "",
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
    ownerFirstName: initialOwnerContact.firstName,
    ownerLastName: initialOwnerContact.lastName,
    ownerPhone: initialOwnerContact.phone,
    ownerEmail: initialOwnerContact.email,
    ownerNotes: initialOwnerContact.notes,
    ownerDocumentUrls: [...initialOwnerContact.documentUrls],
  });
  const consultantFieldsReadOnly = consultantLocked || (viewerRole === "ADMIN" && !!form.selectedAgentId);

  useEffect(() => {
    if (
      wizardNavBlock === "basics" &&
      wizardBasicsStepComplete({
        listingId: form.listingId,
        title: form.title,
        kind: form.kind,
        propertyCategory: form.propertyCategory,
        propertySubtypeKey: form.propertySubtypeKey,
        price: form.price,
        currency: form.currency,
      })
    ) {
      setWizardNavBlock(null);
      setMessage(null);
      setMessageType(null);
      return;
    }
    if (
      wizardNavBlock === "owner" &&
      wizardOwnerStepComplete({
        ownerFirstName: form.ownerFirstName,
        ownerLastName: form.ownerLastName,
        ownerPhone: form.ownerPhone,
      })
    ) {
      setWizardNavBlock(null);
      setMessage(null);
      setMessageType(null);
    }
  }, [
    wizardNavBlock,
    form.propertySubtypeKey,
    form.price,
    form.ownerFirstName,
    form.ownerLastName,
    form.ownerPhone,
  ]);

  function with101Defaults(current: typeof form, overwrite = false): typeof form {
    const apply = (existing: string, inferred: string) => (overwrite ? inferred || existing : existing || inferred);

    return {
      ...current,
      ext101_type_id: apply(current.ext101_type_id, infer101TypeId(current.propertyType)),
      ext101_area_city: apply(current.ext101_area_city, infer101AreaCity(current.city)),
      ext101_area_id: apply(current.ext101_area_id, infer101AreaId(current.city, current.region)),
      ext101_room_count_id: apply(current.ext101_room_count_id, infer101RoomCountId(current.bedrooms, current.livingRooms)),
      ext101_build_age_id: apply(current.ext101_build_age_id, infer101BuildAgeId(effectiveBuildingAgeString(current))),
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
      hangiev_build_age_id: apply(current.hangiev_build_age_id, inferHangievBuildAgeId(effectiveBuildingAgeString(current))),
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

      if (k === "buildingAgePreset") {
        const presetVal = String(v) as BuildingAgePreset;
        const normalizedPreset: BuildingAgePreset =
          presetVal === "zero" || presetVal === "project" ? presetVal : "";
        next.buildingAgePreset = normalizedPreset;
        if (normalizedPreset === "zero" || normalizedPreset === "project") {
          next.buildingAge = "";
        }
      }

      // roomType değişince bedrooms + livingRooms'u senkronize et
      if (k === "roomType") {
        const rt = String(v).trim();
        if (rt && rt.includes("+")) {
          const parts = rt.split("+");
          const beds = parseInt(parts[0], 10);
          const living = parseInt(parts[1], 10);
          if (Number.isFinite(beds)) next.bedrooms = String(beds);
          if (Number.isFinite(living)) next.livingRooms = String(living);
          else next.livingRooms = "";
        } else if (rt === "") {
          // Temizle
          next.bedrooms = "";
          next.livingRooms = "";
        }
      }


      const ageStr = effectiveBuildingAgeString(next);

      if (next.exportTo101evler) {
        if (k === "propertyType") {
          next = { ...next, ext101_type_id: infer101TypeId(next.propertyType) };
        }
        if (k === "bedrooms" || k === "livingRooms") {
          next = { ...next, ext101_room_count_id: infer101RoomCountId(next.bedrooms, next.livingRooms) };
        }
        if (k === "buildingAge" || k === "buildingAgePreset") {
          next = { ...next, ext101_build_age_id: infer101BuildAgeId(ageStr) };
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
        if (k === "buildingAge" || k === "buildingAgePreset") {
          next = { ...next, hangiev_build_age_id: inferHangievBuildAgeId(ageStr) };
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

  const setPropertyTaxonomy = (category: ListingCategoryKey, subtypeKey: string) => {
    const propertyType = formatListingPropertyType(category, subtypeKey);
    setForm((f) => {
      let next = { ...f, propertyCategory: category, propertySubtypeKey: subtypeKey, propertyType };
      if (category === "arsa") {
        next = { ...next, ownedFloorsScope: "single", ownedFloorsLayout: "", ownedFloorsFloorCount: "" };
      }
      if (next.exportTo101evler) {
        next = { ...next, ext101_type_id: infer101TypeId(propertyType) };
      }
      if (next.exportToHangiev) {
        next = { ...next, hangiev_property_type_id: inferHangievPropertyTypeId(propertyType) };
      }
      return next;
    });
  };

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
    if (viewerRole !== "ADMIN") return;
    set("selectedAgentId", agentId);
    if (!agentId) {
      return;
    }
    const agent = agents?.find(a => a.id === agentId);
    if (agent) {
      set("consultantName", agent.name);
      set("consultantPhone", agent.phone ?? "");
      set("consultantWhatsapp", agent.whatsapp ?? "");
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
          updates.city = normalizeListingCitySlug(match ? match.v : address.city);
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

  function isOwnerDocumentFile(f: File): boolean {
    if (isSelectableImageFile(f)) return true;
    const t = (f.type || "").trim().toLowerCase();
    if (t === "application/pdf") return true;
    return /\.pdf$/i.test(f.name);
  }

  async function onOwnerDocumentFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const picked = input.files?.length ? Array.from(input.files) : [];
    input.value = "";
    if (!picked.length) return;
    const list = picked.filter(isOwnerDocumentFile);
    if (!list.length) {
      setWizardNavBlock(null);
      setMessage(t("messages.imageNotRecognized"));
      setMessageType("error");
      return;
    }
    setMessage(null);
    setMessageType(null);
    setWizardNavBlock(null);
    setOwnerDocUploadBusy(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < list.length; i++) {
        urls.push(await postUploadFile(list[i]));
      }
      if (urls.length) {
        setForm((prev) => ({ ...prev, ownerDocumentUrls: [...prev.ownerDocumentUrls, ...urls] }));
      }
    } catch (err) {
      setWizardNavBlock(null);
      setMessage(err instanceof Error ? err.message : t("messages.uploadError"));
      setMessageType("error");
    } finally {
      setOwnerDocUploadBusy(false);
    }
  }

  function removeOwnerDocument(idx: number) {
    setForm((prev) => ({
      ...prev,
      ownerDocumentUrls: prev.ownerDocumentUrls.filter((_, i) => i !== idx),
    }));
  }

  async function onGalleryFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const picked = input.files?.length ? Array.from(input.files) : [];
    input.value = "";
    if (!picked.length) return;
    const list = picked.filter(isSelectableImageFile);
    if (!list.length) {
      setWizardNavBlock(null);
      setMessage(t("messages.imageNotRecognized"));
      setMessageType("error");
      return;
    }
    setMessage(null);
    setMessageType(null);
    setWizardNavBlock(null);
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
          ...had.map((x, i) => ({ ...x, sortOrder: i, isPrimary: i === 0 })),
          ...urls.map((url, i) => ({
            nid: nanoid(),
            url,
            sortOrder: had.length + i,
            isPrimary: had.length === 0 && i === 0,
          })),
        ];
        return merged.map((x, j) => ({
          ...x,
          sortOrder: j,
          isPrimary: j === 0,
        }));
      });
    } catch (err) {
      setWizardNavBlock(null);
      setMessage(err instanceof Error ? err.message : t("messages.uploadError"));
      setMessageType("error");
    } finally {
      setUploadBusy(false);
      setUploadHint("");
    }
  }

  /** Sürükleyerek sıra: HTML5 drag — kaynak indeksinden hedef satırına taşır */
  function reorderGalleryDrag(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    setGallery((prev) => {
      if (fromIdx < 0 || toIdx < 0 || fromIdx >= prev.length || toIdx >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      let insertAt = toIdx;
      if (fromIdx < toIdx) insertAt = toIdx - 1;
      copy.splice(insertAt, 0, moved!);
      return copy.map((row, i) => ({ ...row, sortOrder: i, isPrimary: i === 0 }));
    });
  }

  function removeGalleryRow(idx: number) {
    setGallery((prev) => {
      const row = prev[idx];
      if (!row) return prev;
      const next = prev.filter((_, i) => i !== idx);
      return next.map((r, i) => ({ ...r, sortOrder: i, isPrimary: i === 0 }));
    });
  }

  function normalizeGalleryForSave(rows: GalleryRow[]): SavedGalleryRow[] {
    const trimmed = rows.filter((g) => g.url.trim());
    if (!trimmed.length) return [];
    return trimmed.map((g, i) => ({
      url: g.url.trim(),
      sortOrder: i,
      isPrimary: i === 0,
    }));
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
    setWizardNavBlock(null);
    let preparedForm = form;
    if (preparedForm.exportTo101evler) preparedForm = with101Defaults(preparedForm);
    if (preparedForm.exportToHangiev) preparedForm = withHangievDefaults(preparedForm);
    if (preparedForm !== form) {
      setForm(preparedForm);
    }

    // Step 2 sayısal alan validasyonu (101evler ve Hangiev'in min/max sınırlarına uyum)
    const isArsaStep = preparedForm.propertyCategory === "arsa";
    const isTicariStep = preparedForm.propertyCategory === "ticari";
    const numericLimits: { key: keyof typeof preparedForm; min: number; max: number; label: string }[] = isArsaStep
      ? [
          { key: "landToplamImarOrani", min: 0, max: Number.MAX_SAFE_INTEGER, label: tp("listingEditor.landImarOrani") },
          { key: "landTabanOrani", min: 0, max: 100, label: tp("listingEditor.landTabanOrani") },
          { key: "landMaxKat", min: 0, max: 50, label: tp("listingEditor.landMaxKat") },
          { key: "areaM2", min: 0, max: 100000, label: tp("listingEditor.landToplamAlan") },
          { key: "plotAreaM2", min: 0, max: 1000000, label: tp("listingEditor.landParselAlan") },
        ]
      : [
          { key: "bedrooms", min: 0, max: 20, label: isTicariStep ? tp("listingEditor.roomCountTicari") : PROPERTY_LABELS.bedrooms },
          { key: "bathrooms", min: 0, max: 10, label: PROPERTY_LABELS.bathrooms },
          { key: "toilets", min: 0, max: 10, label: PROPERTY_LABELS.toilets },
          { key: "buildingAge", min: 0, max: 120, label: PROPERTY_LABELS.buildingAge },
          ...(isTicariStep
            ? []
            : [{ key: "livingRooms" as const, min: 0, max: 10, label: PROPERTY_LABELS.livingRooms }]),
        ];
    const violations: string[] = [];
    for (const { key, min, max, label } of numericLimits) {
      if (!isArsaStep && key === "buildingAge" && preparedForm.buildingAgePreset !== "") continue;
      const raw = String(preparedForm[key] ?? "").trim();
      if (raw === "") continue;
      const num = Number(raw);
      if (!Number.isFinite(num) || num < min || num > max) {
        violations.push(tp("listingEditor.rangeError", { label, min, max, value: raw }));
      }
    }
    if (!isArsaStep) {
      const fv = String(preparedForm.floor ?? "").trim();
      if (fv && !isPresetFloorChoiceStored(fv)) {
        const num = Number(fv);
        if (!Number.isFinite(num) || num < -5 || num > 100) {
          violations.push(tp("listingEditor.floorInvalid", { label: PROPERTY_LABELS.floor, value: fv }));
        }
      }
    }

    if (violations.length > 0) {
      setMessage(tp("listingEditor.validationIntro", { detail: violations.join("; ") }));
      setMessageType("error");
      setWizardStep(2);
      return;
    }

    if (preparedForm.exportTo101evler) {
      const feed101CurLabel = tp("listingEditor.feed101Currency");
      const feedPriceLabel = tp("listingEditor.feedPrice");
      const missing101: string[] = [];
      if (!preparedForm.ext101_type_id) missing101.push(tp("listingEditor.labelListingType101"));
      if (!preparedForm.ext101_area_id) missing101.push(tp("listingEditor.labelArea101"));
      if (!Object.prototype.hasOwnProperty.call(CURRENCY_CODE_MAP, preparedForm.currency.toUpperCase())) {
        missing101.push(feed101CurLabel);
      }
      if (!preparedForm.price || Number(preparedForm.price) <= 0) missing101.push(feedPriceLabel);

      if (missing101.length > 0) {
        setMessage(tp("listingEditor.missing101", { fields: missing101.join(", ") }));
        setMessageType("error");
        setWizardStep(missing101.includes(feed101CurLabel) || missing101.includes(feedPriceLabel) ? 0 : 6);
        return;
      }
    }

    if (preparedForm.exportToHangiev) {
      const feedHgCurLabel = tp("listingEditor.feedHangievCurrency");
      const feedPriceLabelHg = tp("listingEditor.feedPrice");
      const missingHangiev: string[] = [];
      if (!Object.prototype.hasOwnProperty.call(HANGIEV_CURRENCY_CODE_MAP, preparedForm.currency.toUpperCase())) {
        missingHangiev.push(feedHgCurLabel);
      }
      if (!preparedForm.price || Number(preparedForm.price) <= 0) missingHangiev.push(feedPriceLabelHg);

      if (missingHangiev.length > 0) {
        setMessage(tp("listingEditor.missingHangiev", { fields: missingHangiev.join(", ") }));
        setMessageType("error");
        setWizardStep(missingHangiev.includes(feedHgCurLabel) || missingHangiev.includes(feedPriceLabelHg) ? 0 : 7);
        return;
      }
    }

    const f = preparedForm;
    const isArsaSave = f.propertyCategory === "arsa";
    const featuresLines = f.featuresText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const parsedCoords = parseLatLngPair(f.coordinates);
    if (!parsedCoords || !parsedCoords.lat || !parsedCoords.lng) {
      setMessage(tp("listingEditor.pickMapLocation"));
      setMessageType("error");
      return;
    }

    if (statusOverride === "PUBLISHED") {
      const ng = normalizeGalleryForSave(gallery);
      if (ng.length === 0) {
        setMessage(tp("errors.saveNeedPhoto"));
        setMessageType("error");
        setWizardStep(3);
        return;
      }
      const activeAgentsCount = agents?.filter((a) => a.is_active ?? true).length ?? 0;
      if (viewerRole === "ADMIN" && activeAgentsCount > 0 && !f.selectedAgentId?.trim()) {
        setMessage(tp("errors.saveNeedConsultant"));
        setMessageType("error");
        setWizardStep(5);
        return;
      }
    }

    const normGallery = normalizeGalleryForSave(gallery);
    const coverOut = normGallery.length > 0 ? normGallery[0]!.url.trim() : "";

    const mergedOwnerDetailFields = mergeDetailFieldsWithOwnerAndPreset(
      listing?.detailFields,
      isArsaSave ? "" : f.buildingAgePreset,
      {
        firstName: f.ownerFirstName,
        lastName: f.ownerLastName,
        phone: f.ownerPhone,
        email: f.ownerEmail,
        notes: f.ownerNotes,
        documentUrls: f.ownerDocumentUrls,
      },
    );
    const detailAfterLand = mergeLandParcelDetailFields(mergedOwnerDetailFields, isArsaSave, {
      imarDurumu: f.landImarDurumu,
      toplamImarOrani: f.landToplamImarOrani,
      tabanOrani: f.landTabanOrani,
      maxKat: f.landMaxKat,
      pricePerDonum: f.landPricePerDonum,
      tags: f.landTags,
    });
    const isTicariSave = f.propertyCategory === "ticari";
    const detailAfterCommercial = mergeCommercialDetailFields(
      detailAfterLand,
      isTicariSave && !isArsaSave,
      f.ticariTags,
    );
    const detailFieldsForSave = mergeOwnedFloorsDetailFields(
      detailAfterCommercial,
      !isArsaSave,
      f.ownedFloorsScope,
      f.ownedFloorsLayout,
      f.ownedFloorsFloorCount,
    );

    // roomType'ı detailFields'a ekle / temizle
    const detailFieldsFinal = (() => {
      let obj: Record<string, unknown> = {};
      try { if (detailFieldsForSave.trim()) obj = JSON.parse(detailFieldsForSave) as Record<string, unknown>; } catch { /* ignore */ }
      if (!isArsaSave && f.roomType.trim()) {
        obj.roomType = { value: f.roomType.trim(), visible: true };
      } else {
        delete obj.roomType;
      }
      return JSON.stringify(obj);
    })();

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
      bedrooms: isArsaSave ? "" : f.bedrooms,
      bathrooms: isArsaSave ? "" : f.bathrooms,
      toilets: isArsaSave ? "" : f.toilets,
      areaM2: f.areaM2,
      plotAreaM2: f.plotAreaM2,
      floor: isArsaSave ? "" : f.floor,
      buildingAge: isArsaSave
        ? ""
        : f.buildingAgePreset === "project"
          ? ""
          : f.buildingAgePreset === "zero"
            ? "0"
            : f.buildingAge,
      livingRooms: isArsaSave || isTicariSave ? "" : f.livingRooms,
      hasPool: isArsaSave || isTicariSave ? false : f.hasPool,
      hasGarden: isArsaSave || isTicariSave ? false : f.hasGarden,
      hasFireplace: isArsaSave || isTicariSave ? false : f.hasFireplace,
      hasParking: isArsaSave || isTicariSave ? false : f.hasParking,
      furnished: isArsaSave || isTicariSave ? false : f.furnished,
      seaView: isArsaSave || isTicariSave ? false : f.seaView,
      hasElevator: isArsaSave ? false : f.hasElevator,
      hasBalcony: isArsaSave || isTicariSave ? false : f.hasBalcony,
      hasTerrace: isArsaSave || isTicariSave ? false : f.hasTerrace,
      hasAirConditioning: isArsaSave || isTicariSave ? false : f.hasAirConditioning,
      hasGatedCommunity: isArsaSave || isTicariSave ? false : f.hasGatedCommunity,
      titleDeedOwnership: f.titleDeedOwnership,
      detailFields: detailFieldsFinal,
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
      consultantOffice: fixedOfficeName,
      consultantPhoto: f.consultantPhoto,
      consultantOfficeLogo: fixedOfficeLogo,
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
        // billing_cycle_id sadece kiralık ilanlarda geçerlidir; satılık/proje için null gönder
        billing_cycle_id: (f.kind === "KIRALIK" || f.kind === "GUNLUK_KIRALIK") && f.ext101_billing_cycle_id
          ? Number(f.ext101_billing_cycle_id)
          : null,
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
      selectedAgentId: f.selectedAgentId,
    };

    try {
      const result = await saveListing(payload);
      void result;
      const statusLabel =
        statusOverride === "PUBLISHED"
          ? viewerRole === "ADMIN"
            ? tp("listingEditor.successPublished")
            : tp("listingEditor.successPending")
          : tp("listingEditor.successDraft");
      setMessage(tp("listingEditor.successLine", { status: statusLabel }));
      setMessageType("success");
      router.refresh();
      setTimeout(() => {
        router.push("/karealfaadmin/ilanlar");
      }, 1500);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : tp("common.unknownErrorOccurred");
      console.error("Save error:", e);
      setMessage(tp("listingEditor.saveError", { detail: errorMsg }));
      setMessageType("error");

      if (errorMsg === "LISTING_DUPLICATE") {
        const newId = await suggestListingId();
        set("listingId", newId);
        setMessage(tp("listingEditor.idCollision", { id: newId }));
      }
    }
  }

  const steps = [
    { icon: "info" as AdminIconName, label: tp("listingEditor.stepBasic") },
    { icon: "map" as AdminIconName, label: tp("listingEditor.stepMap") },
    { icon: "home" as AdminIconName, label: tp("listingEditor.stepFeatures") },
    { icon: "photo_library" as AdminIconName, label: tp("listingEditor.stepMedia") },
    { icon: "description" as AdminIconName, label: "Açıklama" },
    { icon: "call" as AdminIconName, label: tp("listingEditor.stepOwner") },
    { icon: "person" as AdminIconName, label: tp("listingEditor.stepConsultant") },
    { icon: "settings" as AdminIconName, label: tp("listingEditor.step101") },
    { icon: "settings" as AdminIconName, label: tp("listingEditor.stepHangiev") },
  ];

  function goWizardStep(target: number) {
    const leavingIncompleteBasics =
      wizardStep === 0 &&
      target > 0 &&
      !wizardBasicsStepComplete({
        listingId: form.listingId,
        title: form.title,
        kind: form.kind,
        propertyCategory: form.propertyCategory,
        propertySubtypeKey: form.propertySubtypeKey,
        price: form.price,
        currency: form.currency,
      });
    if (leavingIncompleteBasics) {
      setWizardNavBlock("basics");
      setMessage(tp("listingEditor.basicsStepIncomplete"));
      setMessageType("error");
      return;
    }

    const skippingOwnerIncomplete =
      target > WIZARD_OWNER_STEP_INDEX &&
      !wizardOwnerStepComplete({
        ownerFirstName: form.ownerFirstName,
        ownerLastName: form.ownerLastName,
        ownerPhone: form.ownerPhone,
      });
    if (skippingOwnerIncomplete) {
      setWizardNavBlock("owner");
      setMessage(tp("listingEditor.ownerStepIncomplete"));
      setMessageType("error");
      return;
    }

    setWizardNavBlock(null);
    setWizardStep(target);
  }

  const isArsa = form.propertyCategory === "arsa";
  const isTicari = form.propertyCategory === "ticari" && !isArsa;

  const adminNeedsConsultantSelection =
    viewerRole === "ADMIN" &&
    (agents?.filter((a) => a.is_active ?? true).length ?? 0) > 0 &&
    !form.selectedAgentId.trim();

  const siteListingPreviewHref =
    listing?.id && form.listingId.trim()
      ? `/${locale}/ilan/${encodeURIComponent(form.listingId.trim())}`
      : null;

  return (
    <div className="space-y-8 pb-28">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold md:text-3xl">{listing ? tp("listingEditor.titleEdit") : tp("listingEditor.titleNew")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{tp("listingEditor.subtitleSteps")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {siteListingPreviewHref ? (
            <a
              href={siteListingPreviewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            >
              {tp("listingEditor.preview")}
            </a>
          ) : (
            <span
              className="inline-flex cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-400 opacity-65"
              title={tp("listingEditor.previewNeedSave")}
            >
              {tp("listingEditor.preview")}
            </span>
          )}
          <button
            type="button"
            onClick={saveDraft}
            disabled={pending || uploadBusy}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 disabled:opacity-50"
          >
            {tp("listingEditor.saveDraft")}
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={pending || uploadBusy || adminNeedsConsultantSelection}
            title={
              adminNeedsConsultantSelection
                ? tp("listingEditor.needConsultantFirst")
                : undefined
            }
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-emerald-600/25 disabled:opacity-50 hover:bg-emerald-700"
          >
            {viewerRole === "ADMIN" ? tp("listingEditor.publishAdmin") : tp("listingEditor.submitApproval")}
          </button>
        </div>
      </div>

      {uploadHint && <p className="text-sm font-medium text-emerald-600">{uploadHint}</p>}
      {message && messageType === "success" && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
          <p className="text-sm font-semibold text-emerald-800">{message}</p>
          <p className="text-xs text-emerald-600 mt-1">{tp("listingEditor.redirecting")}</p>
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
            {tp("listingEditor.stepCounter", { current: wizardStep + 1, total: steps.length })}
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
            onClick={() => goWizardStep(i)}
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
              İlan No <span className="text-red-500">*</span>
              <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.listingId} onChange={(e) => set("listingId", e.target.value)} />
              <span className="mt-1 block text-xs text-zinc-400">Otomatik oluşturulur, değiştirebilirsiniz</span>
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              Başlık <span className="text-red-500">*</span>
              <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.title} onChange={(e) => set("title", e.target.value)} />
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              İlan Türü <span className="text-red-500">*</span>
              <select className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.kind} onChange={(e) => set("kind", e.target.value)}>
                <option value="SATILIK">Satılık</option>
                <option value="KIRALIK">Kiralık</option>
                <option value="GUNLUK_KIRALIK">Günlük Kiralık</option>
                <option value="PROJE">Proje</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              {th("category")} <span className="text-red-500">*</span>
              <select
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                value={form.propertyCategory}
                onChange={(e) => setPropertyTaxonomy(e.target.value as ListingCategoryKey, "")}
              >
                {LISTING_CATEGORY_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k === "konut"
                      ? th("catKonut")
                      : k === "arsa"
                        ? th("catArsa")
                        : k === "ticari"
                          ? th("catTicari")
                          : th("catProje")}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              {th("propertyType")} <span className="text-red-500">*</span>
              <select
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                value={form.propertySubtypeKey}
                onChange={(e) => setPropertyTaxonomy(form.propertyCategory, e.target.value)}
              >
                <option value="">{th("allSubTypes")}</option>
                {LISTING_SUBTYPE_MAP[form.propertyCategory].map((sk) => (
                  <option key={sk} value={sk}>
                    {th(`subTypes.${sk}` as Parameters<typeof th>[0])}
                  </option>
                ))}
              </select>
            </label>
            <div className="block">
              <label className="block text-sm font-medium text-zinc-700">
                Fiyat <span className="text-red-500">*</span>
                <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" inputMode="decimal" value={form.price} onChange={(e) => set("price", e.target.value)} />
              </label>
              {isArsa ? (
                <label className="mt-2 flex items-center gap-2 text-sm font-medium text-zinc-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500/30"
                    checked={form.landPricePerDonum}
                    onChange={(e) => set("landPricePerDonum", e.target.checked)}
                  />
                  Dönüm fiyatı (girilen fiyat dönüm başınadır)
                </label>
              ) : null}
            </div>
            <label className="block text-sm font-medium text-zinc-700">
              Para Birimi <span className="text-red-500">*</span>
              <select className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
                <option value="TRY">TRY (₺)</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              Oda Tipi
              <select
                className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 transition-colors ${
                  isArsa
                    ? "border-zinc-100 bg-zinc-100 text-zinc-400 cursor-not-allowed"
                    : "border-zinc-200 bg-zinc-50 text-zinc-800 focus:border-emerald-500 focus:ring-emerald-500/20"
                }`}
                value={isArsa ? "" : form.roomType}
                disabled={isArsa}
                onChange={(e) => set("roomType", e.target.value)}
              >
                <option value="">— Seçiniz —</option>
                {[
                  "1+0","1+1","2+1","2+2","3+1","3+2",
                  "4+1","4+2","5","5+1","5+2","5+3","5+4",
                  "6+1","6+2","6+3","6+4",
                  "7+1","7+2","7+3","8+",
                ].map((rt) => (
                  <option key={rt} value={rt}>{rt}</option>
                ))}
              </select>
              {isArsa && (
                <span className="mt-1 block text-xs text-zinc-400">Arsa/arazi ilanlarında oda tipi girilmez</span>
              )}
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

        </>
      )}

      {/* STEP 2: Özellikler */}
      {wizardStep === 2 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-800">Emlak Özellikleri</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {isArsa
              ? "Arsa / arazi için imar ve parsel bilgilerini girin"
              : "Oda sayısı, metrekare ve diğer özellikleri girin"}
          </p>

          {!isArsa ? (
          <fieldset className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
            <legend className="px-1 text-sm font-semibold text-zinc-800">Bina yaşı</legend>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                <input
                  type="radio"
                  name="buildingAgePreset"
                  checked={form.buildingAgePreset === ""}
                  onChange={() => set("buildingAgePreset", "")}
                  className="h-4 w-4 border-zinc-300 text-emerald-600 focus:ring-emerald-500/20"
                />
                Yaşı gir (manuel)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                <input
                  type="radio"
                  name="buildingAgePreset"
                  checked={form.buildingAgePreset === "zero"}
                  onChange={() => set("buildingAgePreset", "zero")}
                  className="h-4 w-4 border-zinc-300 text-emerald-600 focus:ring-emerald-500/20"
                />
                Sıfır
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                <input
                  type="radio"
                  name="buildingAgePreset"
                  checked={form.buildingAgePreset === "project"}
                  onChange={() => set("buildingAgePreset", "project")}
                  className="h-4 w-4 border-zinc-300 text-emerald-600 focus:ring-emerald-500/20"
                />
                Proje
              </label>
            </div>
            {form.buildingAgePreset === "" ? (
              <label className="mt-4 block text-sm font-medium text-zinc-700">
                <span className="flex items-center justify-between">
                  <span>{PROPERTY_LABELS.buildingAge}</span>
                  <span className="text-[11px] font-normal text-zinc-400">0-120 (yıl)</span>
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={120}
                  step={1}
                  className={`mt-1 w-full max-w-xs rounded-xl border bg-zinc-50 px-3 py-2 text-sm outline-none focus:ring-2 ${
                    form.buildingAge !== "" &&
                    (!Number.isFinite(Number(form.buildingAge)) ||
                      Number(form.buildingAge) < 0 ||
                      Number(form.buildingAge) > 120)
                      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                      : "border-zinc-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                  }`}
                  value={form.buildingAge}
                  onChange={(e) => set("buildingAge", e.target.value)}
                />
              </label>
            ) : (
              <p className="mt-3 text-xs text-zinc-500">
                Yaş rakamı girilemez; kayıtta{" "}
                {form.buildingAgePreset === "zero" ? "sıfır" : "proje"} olarak işlenir.
              </p>
            )}
          </fieldset>
          ) : null}

          {isArsa ? (
            <>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* 1. Parsel / arazi alanı */}
                <label className="block text-sm font-medium text-zinc-700">
                  <span className="flex items-center justify-between">
                    <span>Parsel / arazi alanı</span>
                    <span className="text-[11px] font-normal text-zinc-400">m²</span>
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={1000000}
                    step={1}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    value={form.plotAreaM2}
                    onChange={(e) => set("plotAreaM2", e.target.value)}
                  />
                </label>

                {/* 2. Toplam imar oranı */}
                <label className="block text-sm font-medium text-zinc-700">
                  <span className="flex items-center justify-between">
                    <span>Toplam imar oranı</span>
                    <span className="text-[11px] font-normal text-zinc-400">%</span>
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.01}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    value={form.landToplamImarOrani}
                    onChange={(e) => set("landToplamImarOrani", e.target.value)}
                  />
                </label>

                {/* 3. Taban oranı */}
                <label className="block text-sm font-medium text-zinc-700">
                  <span className="flex items-center justify-between">
                    <span>Taban oranı</span>
                    <span className="text-[11px] font-normal text-zinc-400">% (0–100)</span>
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step={0.01}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    value={form.landTabanOrani}
                    onChange={(e) => set("landTabanOrani", e.target.value)}
                  />
                </label>

                {/* 4. Toplam imar alanı */}
                <label className="block text-sm font-medium text-zinc-700">
                  <span className="flex items-center justify-between">
                    <span>Toplam imar alanı</span>
                    <span className="text-[11px] font-normal text-zinc-400">m²</span>
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100000}
                    step={1}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    value={form.areaM2}
                    onChange={(e) => set("areaM2", e.target.value)}
                  />
                </label>

                {/* 5. Mülkiyet kaç kat çıkabilir */}
                <label className="block text-sm font-medium text-zinc-700">
                  <span className="flex items-center justify-between">
                    <span>Mülkiyet kaç kat çıkabilir</span>
                    <span className="text-[11px] font-normal text-zinc-400">0–50</span>
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={50}
                    step={1}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    value={form.landMaxKat}
                    onChange={(e) => set("landMaxKat", e.target.value)}
                  />
                </label>
              </div>
              <div className="mt-4">
                <p className="text-sm font-semibold text-zinc-800">Konum / çevre</p>
                <p className="mt-0.5 text-xs text-zinc-500">Uygun olanları işaretleyin</p>
                <div className="mt-3 flex flex-wrap gap-4">
                  {LAND_LOCATION_TAG_DEFS.map((t) => (
                    <label key={t.id} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={form.landTags[t.id]}
                        onChange={() =>
                          setForm((prev) => ({
                            ...prev,
                            landTags: { ...prev.landTags, [t.id]: !prev.landTags[t.id] },
                          }))
                        }
                        className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500/20"
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                { key: "bedrooms" as const, min: 0, max: 20, step: 1, hint: "0-20" },
                { key: "bathrooms" as const, min: 0, max: 10, step: 1, hint: "0-10" },
                { key: "toilets" as const, min: 0, max: 10, step: 1, hint: "0-10" },
                { key: "areaM2" as const, min: 0, max: 100000, step: 1, hint: "m²" },
                { key: "plotAreaM2" as const, min: 0, max: 1000000, step: 1, hint: "m²" },
              ] as const
            ).map(({ key, min, max, step, hint }) => {
              const raw = form[key];
              const num = raw === "" ? null : Number(raw);
              const invalid =
                num !== null && (!Number.isFinite(num) || num < min || num > max);
              const fieldLabel =
                key === "bedrooms" && isTicari ? "Oda sayısı" : PROPERTY_LABELS[key];
              return (
                <label key={key} className="block text-sm font-medium text-zinc-700">
                  <span className="flex items-center justify-between">
                    <span>{fieldLabel}</span>
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
            <label className="sm:col-span-2 lg:col-span-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="shrink-0 text-sm font-medium text-zinc-800">{PROPERTY_LABELS.floor}</span>
              <select
                className="w-full max-w-xs rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 sm:max-w-sm"
                value={floorDropdownValue(form.floor)}
                onChange={(e) => set("floor", e.target.value)}
              >
                <option value="">—</option>
                <option value={FLOOR_BASEMENT_CANONICAL}>Bodrum kat</option>
                <option value={FLOOR_GROUND_CANONICAL}>Zemin kat</option>
                {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
                {(() => {
                  const lv = legacyFloorOutsideDropdown(form.floor);
                  return lv ? (
                    <option value={lv}>
                      {lv}
                    </option>
                  ) : null;
                })()}
              </select>
            </label>

            <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
              <p className="text-sm font-medium text-zinc-800">Sahip olunan kat</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Mülkün tek katta mı yoksa kaç kata yayıldığını seçin (dubleks, tripleks, tüm bina veya elle 2–99 kat).
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="radio"
                    name="ownedFloorsLayout"
                    className="h-4 w-4 border-zinc-300 text-emerald-600 focus:ring-emerald-500/20"
                    checked={form.ownedFloorsScope === "single"}
                    onChange={() =>
                      setForm((prev) => ({
                        ...prev,
                        ownedFloorsScope: "single",
                        ownedFloorsLayout: "",
                        ownedFloorsFloorCount: "",
                      }))
                    }
                  />
                  Tek katlı
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="radio"
                    name="ownedFloorsLayout"
                    className="h-4 w-4 border-zinc-300 text-emerald-600 focus:ring-emerald-500/20"
                    checked={form.ownedFloorsScope === "multiple" && form.ownedFloorsLayout === OWNED_FLOORS_LAYOUT_KEYS.duplex}
                    onChange={() =>
                      setForm((prev) => ({
                        ...prev,
                        ownedFloorsScope: "multiple",
                        ownedFloorsLayout: OWNED_FLOORS_LAYOUT_KEYS.duplex,
                        ownedFloorsFloorCount: "",
                      }))
                    }
                  />
                  Dubleks
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="radio"
                    name="ownedFloorsLayout"
                    className="h-4 w-4 border-zinc-300 text-emerald-600 focus:ring-emerald-500/20"
                    checked={form.ownedFloorsScope === "multiple" && form.ownedFloorsLayout === OWNED_FLOORS_LAYOUT_KEYS.triplex}
                    onChange={() =>
                      setForm((prev) => ({
                        ...prev,
                        ownedFloorsScope: "multiple",
                        ownedFloorsLayout: OWNED_FLOORS_LAYOUT_KEYS.triplex,
                        ownedFloorsFloorCount: "",
                      }))
                    }
                  />
                  Tripleks
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="radio"
                    name="ownedFloorsLayout"
                    className="h-4 w-4 border-zinc-300 text-emerald-600 focus:ring-emerald-500/20"
                    checked={form.ownedFloorsScope === "multiple" && form.ownedFloorsLayout === OWNED_FLOORS_LAYOUT_KEYS.whole_building}
                    onChange={() =>
                      setForm((prev) => ({
                        ...prev,
                        ownedFloorsScope: "multiple",
                        ownedFloorsLayout: OWNED_FLOORS_LAYOUT_KEYS.whole_building,
                        ownedFloorsFloorCount: "",
                      }))
                    }
                  />
                  Tüm bina
                </label>
                <label className="flex cursor-pointer flex-wrap items-center gap-2 text-sm text-zinc-700">
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="ownedFloorsLayout"
                      className="h-4 w-4 border-zinc-300 text-emerald-600 focus:ring-emerald-500/20"
                      checked={form.ownedFloorsScope === "multiple" && form.ownedFloorsLayout === OWNED_FLOORS_LAYOUT_KEYS.custom}
                      onChange={() =>
                        setForm((prev) => ({
                          ...prev,
                          ownedFloorsScope: "multiple",
                          ownedFloorsLayout: OWNED_FLOORS_LAYOUT_KEYS.custom,
                        }))
                      }
                    />
                    Elle kat sayısı
                  </span>
                  {form.ownedFloorsScope === "multiple" && form.ownedFloorsLayout === OWNED_FLOORS_LAYOUT_KEYS.custom ? (
                    <span className="flex items-center gap-1.5 pl-6 sm:pl-0">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={2}
                        max={99}
                        step={1}
                        placeholder="örn. 4"
                        className="w-20 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        value={form.ownedFloorsFloorCount}
                        onChange={(e) => set("ownedFloorsFloorCount", e.target.value)}
                        aria-label="Sahip olunan kat adedi"
                      />
                      <span className="text-zinc-600">kat</span>
                    </span>
                  ) : null}
                </label>
              </div>
            </div>

            {!isTicari
              ? (
                  (
                    [{ key: "livingRooms" as const, min: 0, max: 10, step: 1, hint: "0-10" }] as const
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
                  })
                )
              : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            {isTicari ? (
              <>
                {TICARI_TAG_DEFS.map((t) => (
                  <label key={t.id} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={form.ticariTags[t.id]}
                      onChange={() =>
                        setForm((prev) => ({
                          ...prev,
                          ticariTags: { ...prev.ticariTags, [t.id]: !prev.ticariTags[t.id] },
                        }))
                      }
                      className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500/20"
                    />
                    {t.label}
                  </label>
                ))}
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={form.hasElevator}
                    onChange={(e) => set("hasElevator", e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500/20"
                  />
                  Asansör
                </label>
              </>
            ) : (
              ([
                ["hasPool", "Havuz"],
                ["hasGarden", "Bahçe"],
                ["hasFireplace", "Şömine"],
                ["hasParking", "Otopark"],
                ["furnished", "Eşyalı"],
                ["seaView", "Deniz Manzarası"],
                ["hasElevator", "Asansörlü"],
                ["hasBalcony", "Balkon"],
                ["hasTerrace", "Teras"],
                ["hasAirConditioning", "Klima"],
                ["hasGatedCommunity", "Güvenlikli site"],
              ] as const).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form[k]}
                    onChange={(e) => set(k, e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500/20"
                  />
                  {label}
                </label>
              ))
            )}
          </div>
            </>
          )}

          <fieldset className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
            <legend className="px-1 text-sm font-semibold text-zinc-800">Tapu mülkiyeti (isteğe bağlı)</legend>
            <p className="mt-1 text-xs text-zinc-500">
              Doldurmak zorunlu değil. Seçerseniz ilan kartı ve detay sayfasında gösterilir; boş bırakırsanız bu bilgi yayımda yer almaz.
            </p>
            <label className="mt-3 block text-sm font-medium text-zinc-700">
              Seçim
              <select
                className="mt-1 w-full max-w-md rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                value={form.titleDeedOwnership}
                onChange={(e) => set("titleDeedOwnership", e.target.value)}
                aria-label="Tapu mülkiyeti, isteğe bağlı"
              >
                <option value="">— Belirtmiyorum (boş) —</option>
                {TITLE_DEED_OWNERSHIP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

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
              <div>
                <p className="text-sm text-zinc-600">
                  İlk sıradaki fotoğraf liste ve kartlarda <strong className="text-zinc-800">kapak</strong> olarak kullanılır; alttaki sırayı sürükleyerek kapak seçimini de değiştirmiş olursunuz. İkinci ve sonrası sıralarda yer alanlar galeride{" "}
                  <strong className="text-zinc-800">1.</strong>, <strong className="text-zinc-800">2.</strong>,{" "}
                  <strong className="text-zinc-800">3.</strong> … resim olarak gösterilir.
                </p>
                <label className={`mt-4 inline-flex cursor-pointer items-center justify-center rounded-lg border-2 border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 ${uploadBusy ? "pointer-events-none opacity-50" : ""}`}>
                  <input type="file" accept="image/*,.heic,.heif,.avif" multiple className="sr-only" onChange={onGalleryFilesChange} disabled={uploadBusy} />
                  {uploadBusy ? "Yükleniyor..." : "Fotoğraf yükle (birden çok seçilebilir)"}
                </label>
                <p className="mt-2 text-xs text-zinc-500">
                  Sırayı değiştirmek için küçük tutamacı (<GripVertical size={14} strokeWidth={2} className="inline-block align-middle text-zinc-400" />) tutup başka bir fotoğraf kutusunun üzerine bırakın.
                </p>

                {gallery.filter((g) => g.url.trim()).length === 0 ? (
                  <p className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-400">Henüz fotoğraf eklenmedi</p>
                ) : (
                  <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {gallery.map((g, idx) => {
                      const url = g.url.trim();
                      if (!url) return null;
                      const showDropHover = galleryDragOverIdx === idx && galleryDraggingIdx !== idx;
                      const faded = galleryDraggingIdx === idx;
                      return (
                        <li
                          key={g.nid}
                          className={`overflow-hidden rounded-xl border bg-zinc-50 shadow-sm transition-colors ${
                            showDropHover ? "border-emerald-500 ring-2 ring-emerald-400" : "border-zinc-200"
                          } ${faded ? "opacity-[0.42]" : ""}`}
                          onDragOver={(e) => {
                            const ok =
                              [...e.dataTransfer.types].includes(GALLERY_DND_PAYLOAD) ||
                              [...e.dataTransfer.types].includes("text/plain");
                            if (!ok) return;
                            e.preventDefault();
                            e.stopPropagation();
                            e.dataTransfer.dropEffect = "move";
                            setGalleryDragOverIdx(idx);
                          }}
                          onDragLeave={(e) => {
                            const rel = e.relatedTarget as Node | null;
                            if (rel && e.currentTarget.contains(rel)) return;
                            setGalleryDragOverIdx((cur) => (cur === idx ? null : cur));
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const raw =
                              e.dataTransfer.getData(GALLERY_DND_PAYLOAD) ||
                              e.dataTransfer.getData("text/plain") ||
                              "";
                            const from = Number.parseInt(raw, 10);
                            setGalleryDragOverIdx(null);
                            setGalleryDraggingIdx(null);
                            if (!Number.isFinite(from)) return;
                            if (from === idx) return;
                            reorderGalleryDrag(from, idx);
                          }}
                        >
                          <div className="relative aspect-4/3 bg-zinc-200">
                            <Image
                              src={url}
                              alt=""
                              fill
                              className="object-cover pointer-events-none select-none"
                              draggable={false}
                              sizes="(max-width:640px) 50vw, 25vw"
                              unoptimized
                            />
                            <button
                              type="button"
                              draggable
                              title="Sürükleyerek sırayı değiştirin"
                              aria-label="Sürükleyerek sırayı değiştirin"
                              onDragStart={(e) => {
                                try {
                                  e.dataTransfer.setData(GALLERY_DND_PAYLOAD, String(idx));
                                  e.dataTransfer.setData("text/plain", String(idx));
                                } catch {
                                  e.dataTransfer.setData("text/plain", String(idx));
                                }
                                e.dataTransfer.effectAllowed = "move";
                                setGalleryDraggingIdx(idx);
                              }}
                              onDragEnd={() => {
                                setGalleryDraggingIdx(null);
                                setGalleryDragOverIdx(null);
                              }}
                              className="absolute left-2 top-2 z-10 cursor-grab rounded-lg border border-zinc-200/90 bg-white/95 p-1.5 text-zinc-600 shadow-md hover:bg-white active:cursor-grabbing touch-none"
                            >
                              <GripVertical size={18} strokeWidth={2} aria-hidden />
                            </button>
                            {idx === 0 ? (
                              <span className="absolute right-2 top-2 z-[5] rounded bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white shadow-sm">Kapak</span>
                            ) : (
                              <span className="absolute bottom-2 left-2 rounded bg-black/65 px-2 py-0.5 text-xs font-semibold text-white">
                                {idx}. resim
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 p-2">
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

      {/* STEP 4: Açıklama */}
      {wizardStep === 4 && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-800">Kısa Açıklama</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Listeleme sayfalarında ve arama motorlarında görünen özet metin
                </p>
              </div>
              <button
                type="button"
                disabled={aiShortBusy}
                onClick={() => generateAiDescription("short")}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:from-violet-600 hover:to-indigo-700 hover:shadow-lg disabled:opacity-50"
              >
                {aiShortBusy ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>
                )}
                {aiShortBusy ? "Üretiliyor…" : "AI ile Üret"}
              </button>
            </div>
            <textarea
              className="mt-4 min-h-[100px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-relaxed outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              placeholder="İlanı birkaç cümleyle özetleyin…"
              value={form.shortDescription}
              onChange={(e) => set("shortDescription", e.target.value)}
            />
            <span className="mt-1 block text-xs text-zinc-400">
              Google arama sonuçlarında ilanın altında görünür · 140-160 karakter ideal
            </span>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-800">Detaylı Açıklama</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  İlan sayfasında ziyaretçilerin göreceği detaylı bilgi — madde işaretleri, kalın yazı ve listeler kullanabilirsiniz
                </p>
              </div>
              <button
                type="button"
                disabled={aiLongBusy}
                onClick={() => generateAiDescription("long")}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:from-violet-600 hover:to-indigo-700 hover:shadow-lg disabled:opacity-50"
              >
                {aiLongBusy ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>
                )}
                {aiLongBusy ? "Üretiliyor…" : "AI ile Üret"}
              </button>
            </div>
            <div className="mt-4 [&_.ql-container]:min-h-[200px] [&_.ql-container]:rounded-b-xl [&_.ql-container]:border-zinc-200 [&_.ql-container]:bg-zinc-50 [&_.ql-container]:text-sm [&_.ql-editor]:leading-relaxed [&_.ql-toolbar]:rounded-t-xl [&_.ql-toolbar]:border-zinc-200">
              <RichTextEditor
                value={form.longDescription}
                onChange={(v) => set("longDescription", v)}
                placeholder="İlan hakkında detaylı bilgi yazın…"
              />
            </div>
          </section>
        </div>
      )}

      {/* STEP 5: Mal sahibi (yalnızca panel) */}
      {wizardStep === 5 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-800">Mal sahibi bilgileri</h2>
          <p className="mt-1 text-sm text-zinc-600">
            <strong>Ad, soyad ve telefon</strong> zorunludur; doldurmadan sonraki adımlara geçilemez. E-posta ve notlar isteğe bağlıdır. Bu bilgiler yalnızca{" "}
            <strong>admin</strong> ve bu ilanı oluşturan <strong>danışman</strong> tarafından görülebilir; sitede ve XML’de yayımlanmaz.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-zinc-700">
              Ad <span className="text-red-600">*</span>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                value={form.ownerFirstName}
                onChange={(e) => set("ownerFirstName", e.target.value)}
                autoComplete="off"
              />
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              Soyad <span className="text-red-600">*</span>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                value={form.ownerLastName}
                onChange={(e) => set("ownerLastName", e.target.value)}
                autoComplete="off"
              />
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              Telefon <span className="text-red-600">*</span>
              <input
                type="tel"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                value={form.ownerPhone}
                onChange={(e) => set("ownerPhone", e.target.value)}
                autoComplete="off"
              />
            </label>
            <label className="block text-sm font-medium text-zinc-700">
              E-posta
              <input
                type="email"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                value={form.ownerEmail}
                onChange={(e) => set("ownerEmail", e.target.value)}
                autoComplete="off"
              />
            </label>
            <label className="block text-sm font-medium text-zinc-700 sm:col-span-2">
              Not
              <textarea
                className="mt-1 min-h-[96px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                value={form.ownerNotes}
                onChange={(e) => set("ownerNotes", e.target.value)}
                placeholder="Görüşme notları, uygunluk saatleri vb."
              />
            </label>
          </div>

          <div className="mt-6 border-t border-amber-200/80 pt-6">
            <p className="text-sm font-medium text-zinc-800">Koçan ve belgeler</p>
            <p className="mt-1 text-xs text-zinc-600">
              Tapu / koçan fotoğrafları veya PDF belgeleri yükleyin. Bu dosyalar yalnızca panelde görünür.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label
                className={`inline-flex cursor-pointer items-center justify-center rounded-xl border border-amber-400 bg-white px-4 py-2.5 text-sm font-semibold text-amber-900 shadow-sm transition hover:bg-amber-100/80 ${ownerDocUploadBusy ? "pointer-events-none opacity-50" : ""}`}
              >
                <input
                  type="file"
                  accept="image/*,.heic,.heif,.avif,application/pdf,.pdf"
                  className="sr-only"
                  multiple
                  onChange={onOwnerDocumentFilesChange}
                  disabled={ownerDocUploadBusy}
                />
                {ownerDocUploadBusy ? "Yükleniyor…" : "Belge veya fotoğraf ekle"}
              </label>
            </div>
            {form.ownerDocumentUrls.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {form.ownerDocumentUrls.map((url, idx) => {
                  const isPdf = /\.pdf(\?|#|$)/i.test(url);
                  return (
                    <div
                      key={`${url}-${idx}`}
                      className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-amber-200/80 bg-zinc-100 shadow-sm"
                    >
                      {isPdf ? (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-zinc-200/80 p-2">
                          <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-600">PDF</span>
                          <span className="line-clamp-2 text-center text-[10px] text-zinc-500">Belge</span>
                        </div>
                      ) : (
                        <div className="relative h-full w-full">
                          <Image
                            src={url}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 50vw, 180px"
                            unoptimized
                          />
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/60 px-1 py-1.5 text-center">
                        <span className="text-[10px] font-semibold leading-tight text-white sm:text-[11px]">
                          Koçan ve belgeleri ekleyiniz
                        </span>
                      </div>
                      <button
                        type="button"
                        className="absolute right-1.5 top-1.5 z-10 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-md hover:bg-rose-700"
                        onClick={() => removeOwnerDocument(idx)}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* STEP 6: Danışman & Yayın */}
      {wizardStep === 6 && (
        <>
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-800">{tp("listingEditor.consultantCardTitle")}</h2>
            <p className="mt-1 text-sm text-zinc-500">{tp("listingEditor.consultantCardSub")}</p>
            
            {viewerRole === "ADMIN" && agents && agents.length > 0 && (
              <label className="mt-4 block text-sm font-medium text-zinc-700">
                {tp("listingEditor.selectRegisteredConsultant")}
                <select
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  value={form.selectedAgentId}
                  onChange={(e) => handleAgentSelect(e.target.value)}
                >
                  <option value="">{tp("listingEditor.selectConsultantOption")}</option>
                  {agents.filter(a => a.is_active ?? true).map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.title || tp("listingEditor.consultantDefaultTitle")})</option>
                  ))}
                </select>
              </label>
            )}
            
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-zinc-700">
                {CONSULTANT_LABELS.consultantName}
                <input className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none ${consultantFieldsReadOnly ? "border-zinc-200 bg-zinc-100 text-zinc-600" : "border-zinc-200 bg-zinc-50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"}`} value={form.consultantName} onChange={(e) => set("consultantName", e.target.value)} readOnly={consultantFieldsReadOnly} disabled={consultantFieldsReadOnly} />
              </label>
              <label className="block text-sm font-medium text-zinc-700">
                {CONSULTANT_LABELS.consultantPhone}
                <input className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none ${consultantFieldsReadOnly ? "border-zinc-200 bg-zinc-100 text-zinc-600" : "border-zinc-200 bg-zinc-50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"}`} value={form.consultantPhone} onChange={(e) => set("consultantPhone", e.target.value)} readOnly={consultantFieldsReadOnly} disabled={consultantFieldsReadOnly} />
              </label>
              <label className="block text-sm font-medium text-zinc-700">
                {CONSULTANT_LABELS.consultantWhatsapp}
                <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.consultantWhatsapp} onChange={(e) => set("consultantWhatsapp", e.target.value)} />
              </label>
              <label className="block text-sm font-medium text-zinc-700">
                {CONSULTANT_LABELS.consultantEmail}
                <input className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none ${consultantFieldsReadOnly ? "border-zinc-200 bg-zinc-100 text-zinc-600" : "border-zinc-200 bg-zinc-50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"}`} value={form.consultantEmail} onChange={(e) => set("consultantEmail", e.target.value)} readOnly={consultantFieldsReadOnly} disabled={consultantFieldsReadOnly} />
              </label>
              <label className="block text-sm font-medium text-zinc-700">
                {CONSULTANT_LABELS.consultantOffice}
                <input
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-600"
                  value={fixedOfficeName}
                  readOnly
                  disabled
                />
                <p className="mt-1 text-xs text-zinc-500">Ofis bilgisi site ayarlarından otomatik gelir.</p>
              </label>
              
              {/* Danışman Fotoğraf Yükleme */}
              <label className="block text-sm font-medium text-zinc-700">
                {CONSULTANT_LABELS.consultantPhoto}
                <div className="mt-1 flex gap-2">
                  <input className={`flex-1 rounded-xl border px-3 py-2 text-sm outline-none ${consultantFieldsReadOnly ? "border-zinc-200 bg-zinc-100 text-zinc-600" : "border-zinc-200 bg-zinc-50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"}`} value={form.consultantPhoto} onChange={(e) => set("consultantPhoto", e.target.value)} placeholder="veya URL girin" readOnly={consultantFieldsReadOnly} disabled={consultantFieldsReadOnly} />
                  {!consultantFieldsReadOnly ? (
                    <label className="cursor-pointer rounded-xl bg-zinc-800 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-900">
                      <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const url = await postUploadFile(file);
                          set("consultantPhoto", url);
                        } catch (err) {
                          setWizardNavBlock(null);
                          setMessage(err instanceof Error ? err.message : "Yükleme hatası");
                          setMessageType("error");
                        }
                      }} />
                      Yükle
                    </label>
                  ) : null}
                </div>
                {form.consultantPhoto && (
                  <div className="mt-2 relative h-16 w-16 rounded-lg overflow-hidden border border-zinc-200">
                    <Image src={form.consultantPhoto} alt="" fill className="object-cover" sizes="64px" unoptimized />
                  </div>
                )}
              </label>

              <label className="block text-sm font-medium text-zinc-700">
                {CONSULTANT_LABELS.consultantOfficeLogo}
                <input
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-600"
                  value={fixedOfficeLogo}
                  readOnly
                  disabled
                />
                {fixedOfficeLogo && (
                  <div className="mt-2 relative h-16 w-16 rounded-lg overflow-hidden border border-zinc-200">
                    <Image src={fixedOfficeLogo} alt="" fill className="object-cover" sizes="64px" unoptimized />
                  </div>
                )}
                <p className="mt-1 text-xs text-zinc-500">Ofis logosu site ayarlarından otomatik gelir.</p>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-800">Etiketler</h2>
            <p className="mt-1 text-sm text-zinc-500">İlan üzerinde görünecek etiketleri seçin</p>
            <div className="mt-3 flex flex-wrap gap-4">
              {(viewerRole === "ADMIN"
                ? (
                    [
                      ["badgeFeatured", "Öne Çıkan (vitrin)"],
                      ["badgeExclusive", "Özel"],
                      ["badgeVirtualTour", "Sanal Tur"],
                      ["badgeVideo", "Video"],
                      ["badgeNew", "Yeni"],
                      ["badgePriceDrop", "Fiyat Düştü"],
                    ] as const
                  )
                : (
                    [
                      ["badgeExclusive", "Özel"],
                      ["badgeVirtualTour", "Sanal Tur"],
                      ["badgeVideo", "Video"],
                      ["badgeNew", "Yeni"],
                      ["badgePriceDrop", "Fiyat Düştü"],
                    ] as const
                  )
              ).map(([k, label]) => (
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

      {/* STEP 7: 101evler XML Yayını */}
      {wizardStep === 7 && (
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

      {/* STEP 8: Hangiev XML Yayını */}
      {wizardStep === 8 && (
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
          {tp("listingEditor.navPrev")}
        </button>
        <span className="text-xs font-medium text-zinc-400">
          {tp("listingEditor.stepCounter", { current: wizardStep + 1, total: steps.length })}
        </span>
        <button
          type="button"
          disabled={wizardStep === steps.length - 1}
          onClick={() => goWizardStep(wizardStep + 1)}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-700 disabled:opacity-30"
        >
          {tp("listingEditor.navNext")}
          <AdminIcon name="arrow_forward" size={18} />
        </button>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-wrap items-center justify-center gap-2 border-t border-zinc-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-md lg:left-64">
        <span className="hidden text-xs text-zinc-400 sm:inline">{tp("listingEditor.dontForgetSave")}</span>
        <button type="button" onClick={saveDraft} disabled={pending || uploadBusy} className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 disabled:opacity-50">
          {tp("listingEditor.saveDraft")}
        </button>
        <button
          type="button"
          onClick={publish}
          disabled={pending || uploadBusy || adminNeedsConsultantSelection}
          title={
            adminNeedsConsultantSelection
              ? tp("listingEditor.needConsultantFirst")
              : undefined
          }
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-emerald-600/25 disabled:opacity-50 hover:bg-emerald-700"
        >
          {viewerRole === "ADMIN" ? tp("listingEditor.publishAdmin") : tp("listingEditor.submitApproval")}
        </button>
      </div>
    </div>
  );
}
