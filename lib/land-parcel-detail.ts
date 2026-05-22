/**
 * Arsa / arazi ilanları — detay alanları (detailFields) ve vitrin satırları.
 * (listing-utils içinde kullanıldığı için burada parse tekrarlanır; döngüsel import yok.)
 */
export type LandDetailFieldEntry = { value: string; visible: boolean };
type LandDetailFieldsMap = Record<string, LandDetailFieldEntry>;

function parseDetailFieldsJson(raw: string | null | undefined): LandDetailFieldsMap {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as LandDetailFieldsMap;
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

export const LAND_DETAIL_KEY_IMAR = "landImarDurumu";
export const LAND_DETAIL_KEY_IMAR_ORAN = "landToplamImarOrani";
export const LAND_DETAIL_KEY_TABAN = "landTabanOrani";
export const LAND_DETAIL_KEY_MAX_KAT = "landMaxKat";
export const LAND_DETAIL_KEY_KONUM = "landKonumOzellikleri";
export const LAND_DETAIL_KEY_PRICE_PER_DONUM = "landPricePerDonum";

const LAND_KEYS = [
  LAND_DETAIL_KEY_IMAR,
  LAND_DETAIL_KEY_IMAR_ORAN,
  LAND_DETAIL_KEY_TABAN,
  LAND_DETAIL_KEY_MAX_KAT,
  LAND_DETAIL_KEY_KONUM,
  LAND_DETAIL_KEY_PRICE_PER_DONUM,
] as const;

export const LAND_LOCATION_TAG_DEFS = [
  { id: "dag_manzara", label: "Dağ manzaralı" },
  { id: "sehir_merkezi", label: "Şehir merkezi" },
  { id: "deniz_manzara", label: "Deniz manzaralı" },
  { id: "koy_merkezi", label: "Köy merkezi" },
  { id: "ana_yol", label: "Ana yol üzeri" },
] as const;

export type LandLocationTagId = (typeof LAND_LOCATION_TAG_DEFS)[number]["id"];

export function emptyLandTags(): Record<LandLocationTagId, boolean> {
  return Object.fromEntries(LAND_LOCATION_TAG_DEFS.map((t) => [t.id, false])) as Record<
    LandLocationTagId,
    boolean
  >;
}

function asEntry(v: string, visible = true): LandDetailFieldEntry {
  return { value: v, visible };
}

function readEntry(map: LandDetailFieldsMap, key: string): string {
  const e = map[key];
  if (!e || typeof e !== "object" || e === null) return "";
  return String((e as LandDetailFieldEntry).value ?? "").trim();
}

/** Konum etiketleri: "id1,id2" veya eski "label, label" (virgüllü metin) */
function parseTagIdsFromKonumValue(raw: string): Record<LandLocationTagId, boolean> {
  const out: Record<string, boolean> = {};
  for (const t of LAND_LOCATION_TAG_DEFS) out[t.id] = false;
  if (!raw.trim()) return out as Record<LandLocationTagId, boolean>;
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const labelToId = new Map(LAND_LOCATION_TAG_DEFS.map((t) => [t.label.toLowerCase(), t.id]));
  for (const p of parts) {
    const byId = LAND_LOCATION_TAG_DEFS.find((t) => t.id === p);
    if (byId) {
      out[byId.id] = true;
      continue;
    }
    const id = labelToId.get(p.toLowerCase());
    if (id) out[id] = true;
  }
  return out as Record<LandLocationTagId, boolean>;
}

export function parseLandFieldsFromDetailFields(detailFields: unknown): {
  imarDurumu: string;
  toplamImarOrani: string;
  tabanOrani: string;
  maxKat: string;
  pricePerDonum: boolean;
  tags: Record<LandLocationTagId, boolean>;
} {
  let map: LandDetailFieldsMap = {};
  if (typeof detailFields === "string" && detailFields.trim()) {
    map = parseDetailFieldsJson(detailFields);
  } else if (detailFields && typeof detailFields === "object" && !Array.isArray(detailFields)) {
    map = detailFields as LandDetailFieldsMap;
  }
  const tagStr = readEntry(map, LAND_DETAIL_KEY_KONUM);
  return {
    imarDurumu: readEntry(map, LAND_DETAIL_KEY_IMAR),
    toplamImarOrani: readEntry(map, LAND_DETAIL_KEY_IMAR_ORAN),
    tabanOrani: readEntry(map, LAND_DETAIL_KEY_TABAN),
    maxKat: readEntry(map, LAND_DETAIL_KEY_MAX_KAT),
    pricePerDonum: readEntry(map, LAND_DETAIL_KEY_PRICE_PER_DONUM) === "1",
    tags: parseTagIdsFromKonumValue(tagStr),
  };
}

/** İlan detayında fiyatın altına "dönüm fiyatı" notu gösterilsin mi? */
export function landPriceIsPerDonumFromDetailFields(detailFieldsRaw: unknown): boolean {
  let map: LandDetailFieldsMap = {};
  if (typeof detailFieldsRaw === "string" && detailFieldsRaw.trim()) {
    map = parseDetailFieldsJson(detailFieldsRaw);
  } else if (detailFieldsRaw && typeof detailFieldsRaw === "object" && !Array.isArray(detailFieldsRaw)) {
    map = detailFieldsRaw as LandDetailFieldsMap;
  }
  return readEntry(map, LAND_DETAIL_KEY_PRICE_PER_DONUM) === "1";
}

export function mergeLandParcelDetailFields(
  existingDetailFieldsJson: string,
  isArsa: boolean,
  land: {
    imarDurumu: string;
    toplamImarOrani: string;
    tabanOrani: string;
    maxKat: string;
    pricePerDonum: boolean;
    tags: Record<LandLocationTagId, boolean>;
  },
): string {
  let obj: Record<string, unknown> = {};
  try {
    if (existingDetailFieldsJson?.trim()) {
      obj = JSON.parse(existingDetailFieldsJson) as Record<string, unknown>;
    }
  } catch {
    obj = {};
  }

  for (const k of LAND_KEYS) {
    delete obj[k];
  }

  if (!isArsa) {
    return JSON.stringify(obj);
  }

  const selectedLabels = LAND_LOCATION_TAG_DEFS.filter((t) => land.tags[t.id]).map((t) => t.label);
  const konumValue = LAND_LOCATION_TAG_DEFS.filter((t) => land.tags[t.id])
    .map((t) => t.id)
    .join(",");

  const setIf = (key: string, val: string) => {
    if (!val.trim()) return;
    obj[key] = asEntry(val.trim());
  };

  setIf(LAND_DETAIL_KEY_IMAR, land.imarDurumu);
  setIf(LAND_DETAIL_KEY_IMAR_ORAN, land.toplamImarOrani);
  setIf(LAND_DETAIL_KEY_TABAN, land.tabanOrani);
  setIf(LAND_DETAIL_KEY_MAX_KAT, land.maxKat);
  if (selectedLabels.length > 0) {
    obj[LAND_DETAIL_KEY_KONUM] = asEntry(konumValue);
  }
  if (land.pricePerDonum) {
    obj[LAND_DETAIL_KEY_PRICE_PER_DONUM] = asEntry("1", false);
  }

  return JSON.stringify(obj);
}

/** İlan kartı / öne çıkanlar listesi — arsa satırları */
export function landParcelHighlightLinesFromDetailFields(detailFieldsRaw: unknown): string[] {
  let map: LandDetailFieldsMap = {};
  if (typeof detailFieldsRaw === "string" && detailFieldsRaw.trim()) {
    map = parseDetailFieldsJson(detailFieldsRaw);
  } else if (detailFieldsRaw && typeof detailFieldsRaw === "object") {
    map = detailFieldsRaw as LandDetailFieldsMap;
  }

  const lines: string[] = [];
  const imar = readEntry(map, LAND_DETAIL_KEY_IMAR);
  const oran = readEntry(map, LAND_DETAIL_KEY_IMAR_ORAN);
  const taban = readEntry(map, LAND_DETAIL_KEY_TABAN);
  const maxK = readEntry(map, LAND_DETAIL_KEY_MAX_KAT);
  const konumRaw = readEntry(map, LAND_DETAIL_KEY_KONUM);

  if (imar) lines.push(`İmar durumu: ${imar}`);
  if (oran) lines.push(`Toplam imar oranı: ${/%$/.test(oran) ? oran : `${oran}%`}`);
  if (taban) lines.push(`Taban oranı: ${/%$/.test(taban) ? taban : `${taban}%`}`);
  if (maxK) lines.push(`Mülkiyet kaç kat çıkabilir: ${maxK}`);
  if (konumRaw) {
    const tags = parseTagIdsFromKonumValue(konumRaw);
    const labels = LAND_LOCATION_TAG_DEFS.filter((t) => tags[t.id]).map((t) => t.label);
    if (labels.length) lines.push(labels.join(", "));
  }

  return lines;
}

export function listingPropertyTypeIsArsa(propertyType: unknown): boolean {
  return String(propertyType ?? "")
    .toLocaleLowerCase("tr-TR")
    .includes("arsa");
}
