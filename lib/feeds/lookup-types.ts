/**
 * Lookup type tanımları ve istemci-güvenli yardımcılar.
 *
 * Bu dosya hiçbir Supabase admin/server-only modülü import etmez; hem RSC
 * hem client componentlerinden import edilebilir.
 */

export type LookupOption = { id: number; label: string };
export type AreaOption = { id: number; city: string; label: string };
export type CurrencyOption = { iso: string; code: number | string; label: string };

export type FeedLookups = {
  ext101: {
    types: LookupOption[];
    areas: AreaOption[];
    titleTypes: LookupOption[];
    roomCounts: LookupOption[];
    buildAges: LookupOption[];
    furnishing: LookupOption[];
    billingCycles: LookupOption[];
    currencies: CurrencyOption[];
    photoGroups: LookupOption[];
    adSpecs: { tag: string; labelTr: string; labelEn: string | null; sort: number }[];
  };
  hangiev: {
    propertyTypes: LookupOption[];
    areas: AreaOption[];
    roomCounts: LookupOption[];
    buildAges: LookupOption[];
    furnishing: LookupOption[];
    currencies: CurrencyOption[];
  };
};

/**
 * Şehir bazlı bölge listesi: ListingEditor "Şehir filtresi" dropdown'ında kullanılır.
 */
export function groupAreasByCity(areas: AreaOption[]): Record<string, LookupOption[]> {
  const grouped: Record<string, LookupOption[]> = {};
  for (const a of areas) {
    if (!grouped[a.city]) grouped[a.city] = [];
    grouped[a.city].push({ id: a.id, label: a.label });
  }
  return grouped;
}
