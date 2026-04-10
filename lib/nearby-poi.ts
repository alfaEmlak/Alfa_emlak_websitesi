/** İlan “yakında neler var” kategorileri — öncelik sırası sabit (market → … → kuaför) */

export type NearbyPoiCategoryId =
  | "market"
  | "pharmacy"
  | "hospital"
  | "transit"
  | "bakery"
  | "cafe"
  | "restaurant"
  | "atm_bank"
  | "park"
  | "school"
  | "gym"
  | "post_office"
  | "mall"
  | "hair_salon";

export type NearbyPoiCategoryDef = {
  id: NearbyPoiCategoryId;
  /** Sitede görünen başlık */
  label: string;
  /** Google Places (New) place types — bir eşleşme yeter */
  googleTypes: string[];
};

/** Tek sıralama: kullanıcı isteğiyle aynı öncelik */
export const NEARBY_POI_CATEGORIES: NearbyPoiCategoryDef[] = [
  { id: "market", label: "Market", googleTypes: ["supermarket", "grocery_store"] },
  { id: "pharmacy", label: "Eczane", googleTypes: ["pharmacy"] },
  { id: "hospital", label: "Hastane / sağlık merkezi", googleTypes: ["hospital", "doctor"] },
  {
    id: "transit",
    label: "Toplu taşıma",
    googleTypes: ["bus_station", "subway_station", "train_station", "light_rail_station", "transit_station"],
  },
  { id: "bakery", label: "Fırın", googleTypes: ["bakery"] },
  { id: "cafe", label: "Kafe", googleTypes: ["cafe"] },
  {
    id: "restaurant",
    label: "Restoran / yemek yerleri",
    googleTypes: ["restaurant", "meal_takeaway", "meal_delivery"],
  },
  { id: "atm_bank", label: "ATM / banka", googleTypes: ["atm", "bank"] },
  { id: "park", label: "Park / yeşil alan", googleTypes: ["park"] },
  { id: "school", label: "Okul", googleTypes: ["school", "primary_school", "secondary_school"] },
  { id: "gym", label: "Spor salonu", googleTypes: ["gym"] },
  { id: "post_office", label: "Kargo / postane", googleTypes: ["post_office"] },
  { id: "mall", label: "AVM / merkez", googleTypes: ["shopping_mall", "department_store"] },
  { id: "hair_salon", label: "Kuaför / berber", googleTypes: ["hair_care", "beauty_salon"] },
];

const ALL_TRUE: Record<NearbyPoiCategoryId, boolean> = Object.fromEntries(
  NEARBY_POI_CATEGORIES.map((c) => [c.id, true]),
) as Record<NearbyPoiCategoryId, boolean>;

export function defaultNearbyPoiCategoryEnabled(): Record<NearbyPoiCategoryId, boolean> {
  return { ...ALL_TRUE };
}

export function parseNearbyPoiCategoriesJson(raw: string | null | undefined): Record<NearbyPoiCategoryId, boolean> {
  const base = defaultNearbyPoiCategoryEnabled();
  if (!raw?.trim()) return base;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    for (const c of NEARBY_POI_CATEGORIES) {
      const v = o[c.id];
      if (typeof v === "boolean") base[c.id] = v;
    }
    return base;
  } catch {
    return base;
  }
}

export function serializeNearbyPoiCategoriesJson(enabled: Record<NearbyPoiCategoryId, boolean>): string | null {
  const allDefault = NEARBY_POI_CATEGORIES.every((c) => enabled[c.id] === true);
  if (allDefault) return null;
  return JSON.stringify(enabled);
}
