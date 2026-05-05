import { NextResponse } from "next/server";
import { getPanelUser } from "@/lib/panel-auth";
import { fetchNearbyPoiRowsPublic } from "@/lib/osm-nearby";
import type { NearbyPoiCategoryId } from "@/lib/nearby-poi";

export async function POST(request: Request) {
  const user = await getPanelUser();
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  let body: { lat?: unknown; lng?: unknown; categories?: Partial<Record<NearbyPoiCategoryId, boolean>> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Geçersiz gövde" }, { status: 400 });
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat ve lng gerekli" }, { status: 400 });
  }

  const rows = await fetchNearbyPoiRowsPublic(lat, lng, body.categories);
  return NextResponse.json({ rows });
}
