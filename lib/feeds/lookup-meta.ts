/**
 * 101evler / Hangiev lookup tablo meta bilgileri.
 *
 * `app/karealfaadmin/lookup-actions.ts` `"use server"` dosyası olduğu için yalnızca
 * async fonksiyon export edebilir. Tablo allowlist'ini ve "kind" bilgisini bu dosyada
 * tutuyoruz; hem action'lar hem de sayfa bunu import edebilsin.
 */

export const LOOKUP_TABLES = {
  ref_101_types: { kind: "simple", label: "101evler · Tip" },
  ref_101_areas: { kind: "area", label: "101evler · Bölge" },
  ref_101_title_types: { kind: "simple", label: "101evler · Tapu Tipi" },
  ref_101_room_counts: { kind: "simple", label: "101evler · Oda Sayısı" },
  ref_101_build_ages: { kind: "simple", label: "101evler · Bina Yaşı" },
  ref_101_furnishing: { kind: "simple", label: "101evler · Eşya Durumu" },
  ref_101_billing_cycles: { kind: "simple", label: "101evler · Kira Periyodu" },
  ref_101_currencies: { kind: "currency", label: "101evler · Para Birimi" },
  ref_101_photo_groups: { kind: "simple", label: "101evler · Fotoğraf Grubu" },
  ref_101_ad_specs: { kind: "ad_spec", label: "101evler · İlan Özelliği" },
  ref_hangiev_property_types: { kind: "simple", label: "Hangiev · Emlak Tipi" },
  ref_hangiev_areas: { kind: "area", label: "Hangiev · Bölge" },
  ref_hangiev_room_counts: { kind: "simple", label: "Hangiev · Oda Sayısı" },
  ref_hangiev_build_ages: { kind: "simple", label: "Hangiev · Bina Yaşı" },
  ref_hangiev_furnishing: { kind: "simple", label: "Hangiev · Eşya Durumu" },
  ref_hangiev_currencies: { kind: "currency", label: "Hangiev · Para Birimi" },
} as const;

export type LookupTableName = keyof typeof LOOKUP_TABLES;
export type LookupTableKind = (typeof LOOKUP_TABLES)[LookupTableName]["kind"];

export function isLookupTable(name: string): name is LookupTableName {
  return Object.prototype.hasOwnProperty.call(LOOKUP_TABLES, name);
}
