/**
 * Hangiev XML feed lookup tables.
 *
 * Hangiev has not provided a final XML specification yet. These defaults mirror
 * the internal/101evler-friendly admin choices so the UI and endpoint can be
 * tested now, while keeping all Hangiev-specific mappings isolated here.
 */

export type Option<T = number> = { id: T; label: string };

export const HANGIEV_PROPERTY_TYPE_OPTIONS: Option[] = [
  { id: 1, label: "Villa" },
  { id: 2, label: "Daire" },
  { id: 3, label: "İkiz Villa" },
  { id: 4, label: "Müstakil Ev" },
  { id: 5, label: "Arsa" },
  { id: 6, label: "Tarla" },
  { id: 7, label: "Dükkan" },
  { id: 8, label: "Hotel" },
  { id: 9, label: "Studio" },
  { id: 10, label: "Penthouse" },
  { id: 11, label: "Bungalow" },
  { id: 12, label: "İş Yeri" },
  { id: 14, label: "Depo" },
  { id: 16, label: "Komple Bina" },
  { id: 19, label: "Ofis" },
  { id: 20, label: "Residence" },
];

export { AREA_ID_OPTIONS as HANGIEV_AREA_ID_OPTIONS } from "./101evler-constants";
export { ROOM_COUNT_OPTIONS as HANGIEV_ROOM_COUNT_OPTIONS } from "./101evler-constants";
export { BUILD_AGE_OPTIONS as HANGIEV_BUILD_AGE_OPTIONS } from "./101evler-constants";
export { FURNISHING_OPTIONS as HANGIEV_FURNISHING_OPTIONS } from "./101evler-constants";
export { PRICE_FOR as HANGIEV_PRICE_FOR } from "./101evler-constants";

export const HANGIEV_CURRENCY_CODE_MAP: Record<string, string> = {
  EUR: "EUR",
  TRY: "TRY",
  GBP: "GBP",
  USD: "USD",
};
