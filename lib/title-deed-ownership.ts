/** Tapu mülkiyeti — ilan formu ve site görünümü (Supabase: title_deed_ownership). */

export const TITLE_DEED_OWNERSHIP_OPTIONS = [
  { value: "turk_mali", label: "Türk malı" },
  { value: "sehit_cocugu", label: "Şehit çocuğu" },
  { value: "esdeger", label: "Eşdeğer" },
  { value: "kirsal_kesim", label: "Kırsal kesim" },
  { value: "tahsis", label: "Tahsis" },
] as const;

export type TitleDeedOwnershipId = (typeof TITLE_DEED_OWNERSHIP_OPTIONS)[number]["value"];

export function parseTitleDeedOwnership(raw: unknown): TitleDeedOwnershipId | "" {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return "";
  return TITLE_DEED_OWNERSHIP_OPTIONS.some((o) => o.value === s) ? (s as TitleDeedOwnershipId) : "";
}

export function titleDeedOwnershipLabel(raw: unknown): string | null {
  const id = parseTitleDeedOwnership(raw);
  if (!id) return null;
  return TITLE_DEED_OWNERSHIP_OPTIONS.find((o) => o.value === id)?.label ?? null;
}
