import { NextResponse } from "next/server";
import { searchListingsForAssistant } from "@/lib/ai/listings";
import type { ListingSearchParams } from "@/lib/ai/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ListingSearchParams & { locale?: string };
    const locale = body.locale || "tr";
    const listings = await searchListingsForAssistant(body, locale);
    return NextResponse.json({ success: true, listings });
  } catch {
    return NextResponse.json(
      { success: false, error: "Şu anda ilanları getirirken teknik bir sorun oluştu. Lütfen tekrar deneyin." },
      { status: 500 },
    );
  }
}
