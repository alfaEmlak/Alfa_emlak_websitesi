import type { Listing } from "@prisma/client";
import {
  NEARBY_POI_CATEGORIES,
  defaultNearbyPoiCategoryEnabled,
  parseNearbyPoiCategoriesJson,
  type NearbyPoiCategoryId,
} from "@/lib/nearby-poi";

export type NearbyPoiRow = {
  categoryId: NearbyPoiCategoryId;
  categoryLabel: string;
  name: string;
  distanceM: number;
  distanceLabel: string;
};

type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = { elements?: OsmElement[] };

function haversineDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatNearbyDistanceTr(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

function pickCategory(tags: Record<string, string> | undefined): NearbyPoiCategoryId | null {
  if (!tags) return null;
  const amenity = tags.amenity;
  const shop = tags.shop;
  const leisure = tags.leisure;

  if (shop === "supermarket" || shop === "convenience" || shop === "grocery") return "market";
  if (amenity === "pharmacy") return "pharmacy";
  if (amenity === "hospital" || amenity === "clinic" || amenity === "doctors") return "hospital";
  if (amenity === "bus_station" || amenity === "bus_stop" || amenity === "ferry_terminal" || tags.public_transport) return "transit";
  if (shop === "bakery") return "bakery";
  if (amenity === "cafe") return "cafe";
  if (amenity === "restaurant" || amenity === "fast_food" || amenity === "food_court") return "restaurant";
  if (amenity === "atm" || amenity === "bank") return "atm_bank";
  if (leisure === "park" || leisure === "garden") return "park";
  if (amenity === "school" || amenity === "college" || amenity === "kindergarten") return "school";
  if (leisure === "fitness_centre" || leisure === "sports_centre" || amenity === "gym") return "gym";
  if (amenity === "post_office" || shop === "copyshop") return "post_office";
  if (shop === "mall" || shop === "department_store") return "mall";
  if (shop === "hairdresser" || shop === "beauty") return "hair_salon";

  return null;
}

function overpassQuery(lat: number, lng: number, radiusM: number): string {
  return `
[out:json][timeout:25];
(
  nwr(around:${radiusM},${lat},${lng})["shop"~"supermarket|convenience|grocery|bakery|mall|department_store|hairdresser|beauty"];
  nwr(around:${radiusM},${lat},${lng})["amenity"~"pharmacy|hospital|clinic|doctors|bus_station|bus_stop|ferry_terminal|cafe|restaurant|fast_food|food_court|atm|bank|school|college|kindergarten|post_office|gym"];
  nwr(around:${radiusM},${lat},${lng})["public_transport"];
  nwr(around:${radiusM},${lat},${lng})["leisure"~"park|garden|fitness_centre|sports_centre"];
);
out center tags 240;
`;
}

async function fetchOverpass(lat: number, lng: number): Promise<OsmElement[]> {
  const q = overpassQuery(lat, lng, 2200);
  const body = new URLSearchParams({ data: q }).toString();
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body,
      });
      if (!res.ok) continue;
      const data = (await res.json()) as OverpassResponse;
      return data.elements ?? [];
    } catch {
      // try fallback endpoint
    }
  }
  return [];
}

export async function fetchNearbyPoiRows(
  lat: number,
  lng: number,
  enabled: Record<NearbyPoiCategoryId, boolean>,
): Promise<NearbyPoiRow[]> {
  const elements = await fetchOverpass(lat, lng);
  if (!elements.length) return [];

  const best = new Map<NearbyPoiCategoryId, { name: string; distanceM: number }>();

  for (const el of elements) {
    const cat = pickCategory(el.tags);
    if (!cat || !enabled[cat]) continue;
    const pLat = el.lat ?? el.center?.lat;
    const pLng = el.lon ?? el.center?.lon;
    if (pLat == null || pLng == null) continue;
    const d = haversineDistanceM(lat, lng, pLat, pLng);
    const name = el.tags?.name?.trim() || NEARBY_POI_CATEGORIES.find((c) => c.id === cat)?.label || cat;
    const prev = best.get(cat);
    if (!prev || d < prev.distanceM) best.set(cat, { name, distanceM: d });
  }

  const rows: NearbyPoiRow[] = [];
  for (const cat of NEARBY_POI_CATEGORIES) {
    if (!enabled[cat.id]) continue;
    const hit = best.get(cat.id);
    if (!hit) continue;
    rows.push({
      categoryId: cat.id,
      categoryLabel: cat.label,
      name: hit.name,
      distanceM: hit.distanceM,
      distanceLabel: formatNearbyDistanceTr(hit.distanceM),
    });
  }
  return rows;
}

export async function getNearbyPoiRowsForListing(listing: Listing): Promise<NearbyPoiRow[]> {
  if (listing.lat == null || listing.lng == null) return [];
  const enabled = parseNearbyPoiCategoriesJson((listing as Listing & { nearbyPoiCategoriesJson?: string | null }).nearbyPoiCategoriesJson);
  return fetchNearbyPoiRows(listing.lat, listing.lng, enabled);
}

export async function fetchNearbyPoiRowsPublic(
  lat: number,
  lng: number,
  enabledPartial?: Partial<Record<NearbyPoiCategoryId, boolean>>,
): Promise<NearbyPoiRow[]> {
  const enabled = defaultNearbyPoiCategoryEnabled();
  if (enabledPartial) {
    for (const k of Object.keys(enabledPartial) as NearbyPoiCategoryId[]) {
      if (typeof enabledPartial[k] === "boolean") enabled[k] = enabledPartial[k]!;
    }
  }
  return fetchNearbyPoiRows(lat, lng, enabled);
}
