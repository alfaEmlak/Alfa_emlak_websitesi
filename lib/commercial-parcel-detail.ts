/**
 * Ticari ilan — cadde / konum etiketleri (detailFields).
 * Asansör liste kolonunda hasElevator ile tutulur.
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

function readVisibleVal(map: DetailMap, key: string): boolean {
  const e = map[key];
  if (!e || typeof e !== "object") return false;
  const v = String((e as DetailEntry).value ?? "").trim().toLowerCase();
  return v === "evet" || v === "var" || v === "1" || v === "yes";
}

export const TICARI_DETAIL_KEYS = [
  "ticariAnaCadde",
  "ticariAraSokak",
  "ticariAyriOtopark",
  "ticariKendiBodrum",
] as const;

export const TICARI_TAG_DEFS = [
  { id: "ana_cadde" as const, label: "Ana cadde", detailKey: "ticariAnaCadde" },
  { id: "ara_sokak" as const, label: "Ara sokak", detailKey: "ticariAraSokak" },
  { id: "ayri_otopark" as const, label: "Ayrı otopark", detailKey: "ticariAyriOtopark" },
  { id: "kendi_bodrum" as const, label: "Kendine ait bodrum", detailKey: "ticariKendiBodrum" },
] as const;

export type TicariTagId = (typeof TICARI_TAG_DEFS)[number]["id"];

export function emptyTicariTags(): Record<TicariTagId, boolean> {
  return Object.fromEntries(TICARI_TAG_DEFS.map((t) => [t.id, false])) as Record<TicariTagId, boolean>;
}

export function parseTicariTagsFromDetailFields(detailFields: unknown): Record<TicariTagId, boolean> {
  let map: DetailMap = {};
  if (typeof detailFields === "string" && detailFields.trim()) {
    map = parseDetailFieldsJson(detailFields);
  } else if (detailFields && typeof detailFields === "object" && !Array.isArray(detailFields)) {
    map = detailFields as DetailMap;
  }
  const out = emptyTicariTags();
  for (const t of TICARI_TAG_DEFS) {
    if (readVisibleVal(map, t.detailKey)) out[t.id] = true;
  }
  return out;
}

function entryYes(): DetailEntry {
  return { value: "Evet", visible: true };
}

export function mergeCommercialDetailFields(
  existingDetailFieldsJson: string,
  isTicari: boolean,
  tags: Record<TicariTagId, boolean>,
): string {
  let obj: Record<string, unknown> = {};
  try {
    if (existingDetailFieldsJson?.trim()) {
      obj = JSON.parse(existingDetailFieldsJson) as Record<string, unknown>;
    }
  } catch {
    obj = {};
  }

  for (const k of TICARI_DETAIL_KEYS) {
    delete obj[k];
  }

  if (!isTicari) {
    return JSON.stringify(obj);
  }

  for (const t of TICARI_TAG_DEFS) {
    if (tags[t.id]) {
      obj[t.detailKey] = entryYes();
    }
  }

  return JSON.stringify(obj);
}

export function ticariHighlightLinesFromDetailFields(detailFieldsRaw: unknown): string[] {
  const tags = parseTicariTagsFromDetailFields(detailFieldsRaw);
  return TICARI_TAG_DEFS.filter((t) => tags[t.id]).map((t) => t.label);
}

export function listingPropertyTypeIsTicari(propertyType: unknown): boolean {
  return String(propertyType ?? "")
    .toLocaleLowerCase("tr-TR")
    .includes("ticari");
}
