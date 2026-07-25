/**
 * Yurt ilanı — olanaklar (boolean etiketler) + sayısal/gelir alanları.
 * Hepsi `detailFields` JSON'unda { value, visible } olarak saklanır; yeni DB
 * kolonu gerektirmez. Ticari etiket yapısıyla (commercial-parcel-detail) aynı
 * deseni izler.
 */

type DetailEntry = { value: string; visible: boolean };
type DetailMap = Record<string, DetailEntry>;

function parseDetailFieldsJson(raw: string | null | undefined): DetailMap {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as DetailMap;
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

function toDetailMap(detailFields: unknown): DetailMap {
  if (typeof detailFields === "string" && detailFields.trim()) {
    return parseDetailFieldsJson(detailFields);
  }
  if (detailFields && typeof detailFields === "object" && !Array.isArray(detailFields)) {
    return detailFields as DetailMap;
  }
  return {};
}

function readVisibleVal(map: DetailMap, key: string): boolean {
  const e = map[key];
  if (!e || typeof e !== "object") return false;
  const v = String((e as DetailEntry).value ?? "").trim().toLowerCase();
  return v === "evet" || v === "var" || v === "1" || v === "yes";
}

/* ────────── Olanaklar (boolean tik listesi) ────────── */

export const YURT_TAG_DEFS = [
  { id: "yemekhane" as const, label: "Yemekhane", detailKey: "yurtYemekhane" },
  { id: "etut_salonu" as const, label: "Etüt / çalışma salonu", detailKey: "yurtEtutSalonu" },
  { id: "ortak_mutfak" as const, label: "Ortak mutfak", detailKey: "yurtOrtakMutfak" },
  { id: "camasirhane" as const, label: "Çamaşırhane", detailKey: "yurtCamasirhane" },
  { id: "kantin" as const, label: "Kantin / kafeterya", detailKey: "yurtKantin" },
  { id: "guvenlik" as const, label: "7/24 güvenlik", detailKey: "yurtGuvenlik" },
  { id: "kamera" as const, label: "Kamera sistemi", detailKey: "yurtKamera" },
  { id: "wifi" as const, label: "Wifi / internet", detailKey: "yurtWifi" },
  { id: "jenerator" as const, label: "Jeneratör", detailKey: "yurtJenerator" },
  { id: "klima" as const, label: "Klima", detailKey: "yurtKlima" },
  { id: "merkezi_isitma" as const, label: "Merkezi ısıtma", detailKey: "yurtMerkeziIsitma" },
  { id: "asansor" as const, label: "Asansör", detailKey: "yurtAsansor" },
  { id: "otopark" as const, label: "Otopark", detailKey: "yurtOtopark" },
  { id: "temizlik" as const, label: "Temizlik hizmeti", detailKey: "yurtTemizlik" },
  { id: "oda_ici_banyo" as const, label: "Oda içi banyo", detailKey: "yurtOdaIciBanyo" },
] as const;

export type YurtTagId = (typeof YURT_TAG_DEFS)[number]["id"];

export function emptyYurtTags(): Record<YurtTagId, boolean> {
  return Object.fromEntries(YURT_TAG_DEFS.map((t) => [t.id, false])) as Record<YurtTagId, boolean>;
}

export function parseYurtTagsFromDetailFields(detailFields: unknown): Record<YurtTagId, boolean> {
  const map = toDetailMap(detailFields);
  const out = emptyYurtTags();
  for (const t of YURT_TAG_DEFS) {
    if (readVisibleVal(map, t.detailKey)) out[t.id] = true;
  }
  return out;
}

/* ────────── Sayısal / metin alanları (value + görünürlük) ────────── */

export const YURT_FIELD_DEFS = [
  { id: "kapasite" as const, label: "Yatak/öğrenci kapasitesi (kişi)", detailKey: "yurtKapasite", kind: "number" as const },
  { id: "odaSayisi" as const, label: "Toplam oda sayısı", detailKey: "yurtOdaSayisi", kind: "number" as const },
  { id: "odaTipi" as const, label: "Oda tipi (1/2/3/4 kişilik)", detailKey: "yurtOdaTipi", kind: "text" as const },
  { id: "katSayisi" as const, label: "Kat sayısı", detailKey: "yurtKatSayisi", kind: "number" as const },
  { id: "kampuseMesafe" as const, label: "Kampüse/üniversiteye mesafe", detailKey: "yurtKampuseMesafe", kind: "text" as const },
  { id: "ruhsat" as const, label: "İşletme ruhsatı", detailKey: "yurtRuhsat", kind: "text" as const },
  { id: "doluluk" as const, label: "Mevcut doluluk", detailKey: "yurtDoluluk", kind: "text" as const },
  { id: "aylikGelir" as const, label: "Aylık gelir (yatırım)", detailKey: "yurtAylikGelir", kind: "text" as const },
] as const;

export type YurtFieldId = (typeof YURT_FIELD_DEFS)[number]["id"];

export type YurtFieldEntry = { value: string; visible: boolean };

export function emptyYurtFields(): Record<YurtFieldId, YurtFieldEntry> {
  return Object.fromEntries(
    YURT_FIELD_DEFS.map((f) => [f.id, { value: "", visible: true }]),
  ) as Record<YurtFieldId, YurtFieldEntry>;
}

export function parseYurtFieldsFromDetailFields(detailFields: unknown): Record<YurtFieldId, YurtFieldEntry> {
  const map = toDetailMap(detailFields);
  const out = emptyYurtFields();
  for (const f of YURT_FIELD_DEFS) {
    const e = map[f.detailKey];
    if (e && typeof e === "object") {
      out[f.id] = {
        value: String((e as DetailEntry).value ?? "").trim(),
        visible: (e as DetailEntry).visible !== false,
      };
    }
  }
  return out;
}

/* ────────── Kaydetme: detailFields JSON'una yaz ────────── */

const ALL_YURT_KEYS: string[] = [
  ...YURT_TAG_DEFS.map((t) => t.detailKey),
  ...YURT_FIELD_DEFS.map((f) => f.detailKey),
];

export function mergeYurtDetailFields(
  existingDetailFieldsJson: string,
  isYurt: boolean,
  tags: Record<YurtTagId, boolean>,
  fields: Record<YurtFieldId, YurtFieldEntry>,
): string {
  let obj: Record<string, unknown> = {};
  try {
    if (existingDetailFieldsJson?.trim()) {
      obj = JSON.parse(existingDetailFieldsJson) as Record<string, unknown>;
    }
  } catch {
    obj = {};
  }

  // Önce tüm yurt anahtarlarını temizle (kategori değişimi/güncelleme için)
  for (const k of ALL_YURT_KEYS) delete obj[k];

  if (!isYurt) {
    return JSON.stringify(obj);
  }

  for (const t of YURT_TAG_DEFS) {
    if (tags[t.id]) {
      obj[t.detailKey] = { value: "Evet", visible: true };
    }
  }
  for (const f of YURT_FIELD_DEFS) {
    const e = fields[f.id];
    const val = (e?.value ?? "").trim();
    if (val) {
      obj[f.detailKey] = { value: val, visible: e.visible !== false };
    }
  }

  return JSON.stringify(obj);
}

export function listingPropertyTypeIsYurt(propertyType: unknown): boolean {
  return String(propertyType ?? "")
    .toLocaleLowerCase("tr-TR")
    .includes("yurt");
}

/** Olanak (tag) detailKey'leri — site detay satırlarından hariç tutmak için. */
export const YURT_TAG_DETAIL_KEYS: readonly string[] = YURT_TAG_DEFS.map((t) => t.detailKey);

/** Sayısal/metin alan detailKey → TR etiket eşlemesi (site detay satırları için). */
export const YURT_FIELD_LABELS: Record<string, string> = Object.fromEntries(
  YURT_FIELD_DEFS.map((f) => [f.detailKey, f.label]),
);

/** Olanakları site kartı/detayında rozet satırı olarak göstermek için. */
export function yurtHighlightLinesFromDetailFields(detailFieldsRaw: unknown): string[] {
  const tags = parseYurtTagsFromDetailFields(detailFieldsRaw);
  return YURT_TAG_DEFS.filter((t) => tags[t.id]).map((t) => t.label);
}
