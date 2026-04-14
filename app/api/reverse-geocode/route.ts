import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  let body: { lat?: unknown; lng?: unknown };
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

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=tr`,
      {
        headers: {
          "User-Agent": "AlfaEmlak/1.0",
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Geocoding servisi yanıt vermedi" }, { status: 502 });
    }

    const data = await response.json();

    const address = data.address || {};
    const result = {
      fullAddress: data.display_name || "",
      city: address.city || address.town || address.village || address.county || "",
      region: address.suburb || address.neighbourhood || address.quarter || "",
      neighborhood: address.neighbourhood || address.quarter || address.hamlet || "",
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return NextResponse.json({ error: "Geocoding hatası" }, { status: 500 });
  }
}
