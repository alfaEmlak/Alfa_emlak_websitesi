/** Panel kat seçimi — zemin / bodrum / elle sayı. DB `floor` metin alanı. */

export const FLOOR_GROUND_CANONICAL = "Zemin";
export const FLOOR_BASEMENT_CANONICAL = "Bodrum kat";

export function isGroundFloorStored(raw: string): boolean {
  const t = raw.trim().toLowerCase();
  if (!t) return false;
  return t === "zemin" || t === "zemin kat" || t === "0" || t === "ground";
}

export function isBasementFloorStored(raw: string): boolean {
  const t = raw.trim().toLowerCase();
  if (!t) return false;
  return (
    t === "bodrum" ||
    t === "bodrum kat" ||
    t === "bodrum kati" ||
    t === "basement" ||
    t === "-1"
  );
}

/** Zemin veya bodrum ön seçimi (elle sayı girişi kapalı) */
export function isPresetFloorChoiceStored(raw: string): boolean {
  return isGroundFloorStored(raw) || isBasementFloorStored(raw);
}

/** Form ilk yüklemede 0 / zemin / bodrum → tek gösterim */
export function normalizeFloorFromListing(raw: string | null | undefined): string {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (isGroundFloorStored(s)) return FLOOR_GROUND_CANONICAL;
  if (isBasementFloorStored(s)) return FLOOR_BASEMENT_CANONICAL;
  return s;
}
