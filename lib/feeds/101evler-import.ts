/**
 * 101evler XML → Supabase `listings` içe aktarma eşleyicisi.
 *
 * 101evler'in bize geri verdiği `<ads>` export'unu (kendi ilanlarımız) okuyup
 * her `<ad>`'i `listings` tablosu satırına + `listing_images` dizisine çevirir.
 * Bu, lib/feeds/101evler-builder.ts'in (export) tam tersidir.
 *
 * Saf/yan etkisiz: yalnızca string parse + eşleme yapar, DB'ye dokunmaz.
 * DB yazımı scripts/import-101evler.ts içinde yapılır.
 */

import {
  AREA_ID_OPTIONS,
  TYPE_ID_OPTIONS,
} from "./101evler-constants";
import { normalizeListingCitySlug } from "@/lib/listing-city";

/* ────────── Ters lookup tabloları ────────── */

const TYPE_LABEL_BY_ID = new Map<number, string>(
  TYPE_ID_OPTIONS.map((o) => [o.id, o.label]),
);

// area_id → şehir (display adı). AREA_ID_OPTIONS şehir adına göre gruplu.
const CITY_BY_AREA_ID = new Map<number, string>();
for (const [city, areas] of Object.entries(AREA_ID_OPTIONS)) {
  for (const a of areas) CITY_BY_AREA_ID.set(a.id, city);
}
// area_id → bölge (mahalle/semt) etiketi
const AREA_LABEL_BY_ID = new Map<number, string>();
for (const areas of Object.values(AREA_ID_OPTIONS)) {
  for (const a of areas) AREA_LABEL_BY_ID.set(a.id, a.label);
}

// ad_specs tag → Türkçe özellik etiketi (features dizisi için)
const SPEC_TAG_TR: Record<string, string> = {
  ac: "Klima",
  balcony: "Balkon",
  barbeku: "Barbekü",
  bounding_wall: "Sınır Duvarları",
  builtin_kitchen: "Ankastre Mutfak",
  ceramic: "Seramik",
  cift_cam: "Çift Cam",
  city_view: "Şehir Manzarası",
  closed_park: "Kapalı Otopark",
  closet: "Gömme Dolap",
  east_face: "Doğu Cepheli",
  electrical_infrastructure: "Elektrik Altyapısı",
  entryphone: "Diafon",
  fire_alarm: "Yangın Alarmı",
  fireplace: "Şömine",
  garage: "Garaj",
  garden: "Bahçe",
  generator: "Jeneratör",
  in_city: "Şehir İçi",
  kepenk: "Kepenk",
  kartonpiyer: "Kartonpiyer",
  laundry: "Çamaşır Odası",
  lift: "Asansör",
  loft_sende_kat: "Sende Katlı",
  master_bath: "Ebeveyn WC",
  master_cabinnet: "Ebeveyn Dolabı",
  mountain_view: "Dağ Manzarası",
  natural_marble: "Doğal Mermer",
  nature_view: "Doğa Manzarası",
  new: "Yeni",
  north_face: "Kuzey Cepheli",
  panel_door: "Panel Kapı",
  park: "Havuz",
  parquet: "Parke",
  pool: "Havuz",
  private_pool: "Özel Havuz",
  public_pool: "Ortak Havuz",
  road: "Yol",
  sari_tas: "Sarı Taş Ev",
  sea_front: "Denize Sıfır",
  sea_view: "Deniz Manzarası",
  security_cam: "Güvenlik Kamerası",
  shower: "Duş",
  solar_electric: "Solar Elektrik Üretimi",
  south_face: "Güney Cepheli",
  steel_door: "Çelik Kapı",
  su_kuyusu: "Su Kuyusu",
  terrace: "Teras",
  thermal_insulation: "Isı Yalıtımı",
  tv_infrastructure: "TV Altyapısı",
  vestiyer: "Vestiyer",
  wallpaper: "Duvar Kağıdı",
  water_booster: "Su Pompası",
  water_infrastructure: "Su Yalıtımı",
  water_tank: "Su Deposu",
  west_face: "Batı Cephesi",
  blind: "Panjur",
  bath_check: "Banyo",
};

/* ────────── Parse yardımcıları ────────── */

const LANGS = ["tr", "en", "ru", "de", "fa"] as const;
type Lang = (typeof LANGS)[number];

export type ParsedAd = {
  raw: Record<string, string>;
  specs: Set<string>;
  pictures: { url: string; order: number }[];
};

/** Tek bir `<ad>` bloğundan skaler/CDATA alanı çıkarır. */
function field(block: string, name: string): string | null {
  const cdata = new RegExp(
    `<${name}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${name}>`,
  ).exec(block);
  if (cdata) return cdata[1].trim();
  const plain = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(block);
  if (plain) return plain[1].trim();
  return null;
}

/** XML metnini ParsedAd dizisine çevirir. */
export function parseAds(xml: string): ParsedAd[] {
  const ads: ParsedAd[] = [];
  const blocks = xml.match(/<ad>[\s\S]*?<\/ad>/g) ?? [];

  for (const block of blocks) {
    // ad_specs ve ad_pictures alt-bloklarını ayır
    const specsBlock = /<ad_specs>([\s\S]*?)<\/ad_specs>/.exec(block)?.[1] ?? "";
    const specs = new Set<string>();
    for (const m of specsBlock.matchAll(/<(\w+)>\s*true\s*<\/\1>/g)) {
      specs.add(m[1]);
    }

    const pictures: { url: string; order: number }[] = [];
    const picsBlock =
      /<ad_pictures>([\s\S]*?)<\/ad_pictures>/.exec(block)?.[1] ?? "";
    for (const pm of picsBlock.matchAll(/<ad_picture>([\s\S]*?)<\/ad_picture>/g)) {
      const url = field(pm[1], "picture_url");
      const order = field(pm[1], "order_by");
      if (url) pictures.push({ url, order: order ? Number(order) : 0 });
    }

    // Skaler alanlar (ad_specs/ad_pictures dışındaki gövde)
    const body = block
      .replace(/<ad_specs>[\s\S]*?<\/ad_specs>/, "")
      .replace(/<ad_pictures>[\s\S]*?<\/ad_pictures>/, "");

    const raw: Record<string, string> = {};
    const scalarFields = [
      "lastupdate", "property_id", "type_id", "type", "first_realtor_id",
      "first_realtor", "second_realtor_id", "area_id", "area", "reference_no",
      "title_type_id", "title_type", "sale_or_rent", "sale_or_rent_text",
      "price", "price_for", "currency", "currency_code", "billing_cycle_id",
      "room_count_id", "room_count", "bedroom_count", "bathroom_count",
      "floor", "floor_count", "total_area", "donum", "evlek", "ayakkare",
      "build_age_id", "build_age", "furnishing_id", "furnishing",
      "land_use", "floor_ratio", "map_available", "lat", "lng",
      "youtube", "t_360",
      ...LANGS.flatMap((l) => [`ad_title_${l}`, `ad_description_${l}`]),
    ];
    for (const f of scalarFields) {
      const v = field(body, f);
      if (v != null && v !== "") raw[f] = v;
    }

    ads.push({ raw, specs, pictures });
  }

  return ads;
}

/* ────────── Eşleme ────────── */

export type MappedListing = {
  listing_id: string;
  property_id: string;
  row: Record<string, unknown>;
  images: { url: string; sort_order: number; is_primary: boolean }[];
};

function num(v: string | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function intOrNull(v: string | undefined): number | null {
  const n = num(v);
  return n == null ? null : Math.trunc(n);
}

/** İçerikten kararlı kısa anahtar (property_id yoksa). FNV-1a 32-bit. */
function stableKey(parts: Array<string | undefined>): string {
  const s = parts.map((p) => (p ?? "").trim()).join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(36);
}

function mapKind(saleOrRent: string | undefined): string {
  switch (saleOrRent) {
    case "R":
      return "KIRALIK";
    case "D":
      return "GUNLUK_KIRALIK";
    default:
      return "SATILIK"; // S ve bilinmeyenler
  }
}

function buildTranslations(raw: Record<string, string>): string | null {
  const out: Record<string, { title?: string; longDescription?: string; shortDescription?: string }> = {};
  for (const l of ["en", "ru", "de", "fa"] as Lang[]) {
    const title = raw[`ad_title_${l}`];
    const desc = raw[`ad_description_${l}`];
    if (!title && !desc) continue;
    out[l] = {};
    if (title) out[l].title = title;
    if (desc) {
      out[l].longDescription = desc;
      out[l].shortDescription = desc;
    }
  }
  return Object.keys(out).length ? JSON.stringify(out) : null;
}

/**
 * Tek bir ParsedAd → listings satırı + görseller.
 * @param idPrefix listing_id öneki (varsayılan "101-")
 */
export function mapAd(ad: ParsedAd, idPrefix = "101-"): MappedListing {
  const r = ad.raw;
  const rawPid = (r.property_id ?? "").trim();
  // property_id 0/boş olan ilanlar için içerikten kararlı anahtar üret.
  const hasRealId = rawPid !== "" && rawPid !== "0";
  const propertyId = hasRealId
    ? rawPid
    : `x${stableKey([r.type, r.area, r.price, r.ad_title_tr, r.sale_or_rent])}`;
  const listingId = `${idPrefix}${propertyId}`;

  const typeId = intOrNull(r.type_id);
  const areaId = intOrNull(r.area_id);

  const cityName = areaId != null ? CITY_BY_AREA_ID.get(areaId) : undefined;
  const regionName =
    r.area || (areaId != null ? AREA_LABEL_BY_ID.get(areaId) : undefined) || "";
  const propertyType =
    r.type || (typeId != null ? TYPE_LABEL_BY_ID.get(typeId) : undefined) || "";

  const titleTypeId = intOrNull(r.title_type_id);

  const has = (tag: string) => ad.specs.has(tag);
  const hasPool = has("park") || has("pool") || has("private_pool") || has("public_pool");
  const hasParking = has("closed_park") || has("garage");
  const seaView = has("sea_view") || has("sea_front");

  // features: tanınan tüm spec tag'lerinin Türkçe etiketleri + koçan türü
  // (titleDeedOwnership kolonu Supabase'te olmadığı için bilgi burada korunur).
  const featureLabels = Array.from(
    new Set(
      [
        ...Array.from(ad.specs).map((t) => SPEC_TAG_TR[t]),
        r.title_type?.trim() || undefined,
      ].filter((x): x is string => Boolean(x)),
    ),
  );

  const furnishingId = intOrNull(r.furnishing_id);
  // 1=Eşyasız, 2=Yarı, 3=Eşyalı, 4=Sadece Beyaz Eşya, 5=Ful Eşyalı
  const furnished =
    furnishingId == null ? null : furnishingId !== 1;

  const lat = num(r.lat);
  const lng = num(r.lng);

  const ext101 = {
    type_id: typeId,
    area_id: areaId,
    title_type_id: titleTypeId,
    room_count_id: intOrNull(r.room_count_id),
    build_age_id: intOrNull(r.build_age_id),
    furnishing_id: furnishingId,
    billing_cycle_id: intOrNull(r.billing_cycle_id),
    price_for: r.price_for === "U" ? "U" : "T",
    reference_no: r.reference_no?.trim() || null,
  };

  const images = [...ad.pictures]
    .sort((a, b) => a.order - b.order)
    .map((p, idx) => ({
      url: p.url,
      sort_order: p.order || idx + 1,
      is_primary: idx === 0,
    }));

  const realtor = r.first_realtor?.trim() || null;

  const row: Record<string, unknown> = {
    listing_id: listingId,
    title: r.ad_title_tr?.trim() || `İlan ${propertyId}`,
    kind: mapKind(r.sale_or_rent),
    property_type: propertyType,
    city: cityName ? normalizeListingCitySlug(cityName) : "",
    region: regionName,
    neighborhood: null,
    full_address: null,
    price: num(r.price) ?? 0,
    currency: r.currency_code?.trim() || "GBP",
    description_tr: r.ad_description_tr?.trim() || null,
    description_en: r.ad_description_en?.trim() || null,
    cover_image: images[0]?.url ?? null,
    bedrooms: intOrNull(r.bedroom_count),
    bathrooms: intOrNull(r.bathroom_count),
    area_m2: num(r.total_area),
    floor: r.floor?.trim() || null,
    has_pool: hasPool,
    has_garden: has("garden"),
    has_fireplace: has("fireplace"),
    has_parking: hasParking,
    furnished,
    sea_view: seaView,
    // Not: has_balcony/has_terrace/has_elevator/has_air_conditioning ve
    // title_deed_ownership Supabase listings tablosunda yok; bu bilgiler
    // features etiketleri içinde korunuyor.
    features: featureLabels.length ? featureLabels : null,
    latitude: lat,
    longitude: lng,
    map_enabled: lat != null && lng != null,
    video_url: r.youtube?.trim() || null,
    virtual_tour_url: r.t_360?.trim() || null,
    translations: buildTranslations(r),
    publish_status: "DRAFT",
    consultant_name: realtor,
    created_by_name: realtor,
    export_to_101evler: false,
    // Tüm 101evler eşleme değerleri JSON'da saklanır (FK kısıtı yok).
    ext_101evler: ext101,
    // *_101 kolonları Supabase'te lookup tablolarına FK; 101evler'in gönderdiği
    // id'lerin bir kısmı (ve "0") o tablolarda olmadığı için null bırakıyoruz.
    // Re-export gerekirse panelden lookup seçilebilir. (price_for/reference_no FK değil.)
    price_for_101: ext101.price_for,
    reference_no_101: ext101.reference_no,
  };

  return { listing_id: listingId, property_id: propertyId, row, images };
}

export type ImportPlan = {
  total: number;
  unique: number;
  duplicates: string[];
  items: MappedListing[];
};

/** XML metnini parse edip eşler; property_id'ye göre tekrarları temizler (son kazanır). */
export function buildImportPlan(xml: string, idPrefix = "101-"): ImportPlan {
  const ads = parseAds(xml);
  const byId = new Map<string, MappedListing>();
  const duplicates: string[] = [];

  for (const ad of ads) {
    const mapped = mapAd(ad, idPrefix);
    if (!mapped.property_id) continue;
    if (byId.has(mapped.property_id)) duplicates.push(mapped.property_id);
    byId.set(mapped.property_id, mapped);
  }

  return {
    total: ads.length,
    unique: byId.size,
    duplicates,
    items: Array.from(byId.values()),
  };
}
