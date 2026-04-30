/**
 * 101evler ve Hangiev için DB lookup tablolarından dropdown verilerini okur.
 *
 * Tüm lookup'lar `ref_101_*` ve `ref_hangiev_*` tablolarında tutulur. Admin
 * panelinin "İlan Editörü" ve "Lookup Yönetimi" sayfaları bu helper üzerinden
 * tek bir SSR isteğiyle veri alır.
 *
 * NOT: Bu dosya `supabaseAdmin` (server-only) bağımlısıdır. Client componentler
 * yalnızca `@/lib/feeds/lookup-types`'tan import etmeli.
 */

// Bu modül `supabaseAdmin` (server-only) bağımlısıdır.
// Client componentlerden ASLA import etmeyin; tip/yardımcı için
// `@/lib/feeds/lookup-types`'ı kullanın.
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AreaOption, CurrencyOption, FeedLookups, LookupOption } from "./lookup-types";

export type { AreaOption, CurrencyOption, FeedLookups, LookupOption } from "./lookup-types";
export { groupAreasByCity } from "./lookup-types";

type RefRow = { id: number; label: string; sort: number; is_active: boolean };
type AreaRow = RefRow & { city: string };
type CurrencyRow = { iso: string; code: number | string; label: string; is_active: boolean };
type AdSpecRow = { tag: string; label_tr: string; label_en: string | null; sort: number; is_active: boolean };

function rowsToOptions(rows: RefRow[] | null | undefined): LookupOption[] {
  if (!rows) return [];
  return rows
    .filter((r) => r.is_active !== false)
    .map((r) => ({ id: r.id, label: r.label }));
}

function rowsToAreaOptions(rows: AreaRow[] | null | undefined): AreaOption[] {
  if (!rows) return [];
  return rows
    .filter((r) => r.is_active !== false)
    .map((r) => ({ id: r.id, city: r.city, label: r.label }));
}

function rowsToCurrencyOptions(rows: CurrencyRow[] | null | undefined): CurrencyOption[] {
  if (!rows) return [];
  return rows
    .filter((r) => r.is_active !== false)
    .map((r) => ({ iso: r.iso, code: r.code, label: r.label }));
}

export async function loadFeedLookups(): Promise<FeedLookups> {
  const [
    types101,
    areas101,
    titleTypes,
    roomCounts101,
    buildAges101,
    furnishing101,
    billingCycles,
    currencies101,
    photoGroups,
    adSpecs,
    propertyTypesHg,
    areasHg,
    roomCountsHg,
    buildAgesHg,
    furnishingHg,
    currenciesHg,
  ] = await Promise.all([
    supabaseAdmin.from("ref_101_types").select("id, label, sort, is_active").order("sort"),
    supabaseAdmin.from("ref_101_areas").select("id, city, label, sort, is_active").order("city").order("sort"),
    supabaseAdmin.from("ref_101_title_types").select("id, label, sort, is_active").order("sort"),
    supabaseAdmin.from("ref_101_room_counts").select("id, label, sort, is_active").order("sort"),
    supabaseAdmin.from("ref_101_build_ages").select("id, label, sort, is_active").order("sort"),
    supabaseAdmin.from("ref_101_furnishing").select("id, label, sort, is_active").order("sort"),
    supabaseAdmin.from("ref_101_billing_cycles").select("id, label, sort, is_active").order("sort"),
    supabaseAdmin.from("ref_101_currencies").select("iso, code, label, is_active"),
    supabaseAdmin.from("ref_101_photo_groups").select("id, label, sort, is_active").order("sort"),
    supabaseAdmin.from("ref_101_ad_specs").select("tag, label_tr, label_en, sort, is_active").order("sort"),
    supabaseAdmin.from("ref_hangiev_property_types").select("id, label, sort, is_active").order("sort"),
    supabaseAdmin.from("ref_hangiev_areas").select("id, city, label, sort, is_active").order("city").order("sort"),
    supabaseAdmin.from("ref_hangiev_room_counts").select("id, label, sort, is_active").order("sort"),
    supabaseAdmin.from("ref_hangiev_build_ages").select("id, label, sort, is_active").order("sort"),
    supabaseAdmin.from("ref_hangiev_furnishing").select("id, label, sort, is_active").order("sort"),
    supabaseAdmin.from("ref_hangiev_currencies").select("iso, code, label, is_active"),
  ]);

  return {
    ext101: {
      types: rowsToOptions(types101.data as RefRow[] | null),
      areas: rowsToAreaOptions(areas101.data as AreaRow[] | null),
      titleTypes: rowsToOptions(titleTypes.data as RefRow[] | null),
      roomCounts: rowsToOptions(roomCounts101.data as RefRow[] | null),
      buildAges: rowsToOptions(buildAges101.data as RefRow[] | null),
      furnishing: rowsToOptions(furnishing101.data as RefRow[] | null),
      billingCycles: rowsToOptions(billingCycles.data as RefRow[] | null),
      currencies: rowsToCurrencyOptions(currencies101.data as CurrencyRow[] | null),
      photoGroups: rowsToOptions(photoGroups.data as RefRow[] | null),
      adSpecs: ((adSpecs.data as AdSpecRow[] | null) ?? [])
        .filter((r) => r.is_active !== false)
        .map((r) => ({ tag: r.tag, labelTr: r.label_tr, labelEn: r.label_en, sort: r.sort })),
    },
    hangiev: {
      propertyTypes: rowsToOptions(propertyTypesHg.data as RefRow[] | null),
      areas: rowsToAreaOptions(areasHg.data as AreaRow[] | null),
      roomCounts: rowsToOptions(roomCountsHg.data as RefRow[] | null),
      buildAges: rowsToOptions(buildAgesHg.data as RefRow[] | null),
      furnishing: rowsToOptions(furnishingHg.data as RefRow[] | null),
      currencies: rowsToCurrencyOptions(currenciesHg.data as CurrencyRow[] | null),
    },
  };
}
