import { NextResponse } from "next/server";
import { getListingForAssistant } from "@/lib/ai/listings";

type Props = { params: Promise<{ listingId: string }> };

export async function GET(req: Request, { params }: Props) {
  try {
    const { listingId } = await params;
    const url = new URL(req.url);
    const locale = url.searchParams.get("locale") || "tr";
    const listing = await getListingForAssistant(listingId, locale);
    if (!listing) {
      return NextResponse.json({ success: false, error: "İlan bulunamadı." }, { status: 404 });
    }
    return NextResponse.json({ success: true, listing });
  } catch {
    return NextResponse.json(
      { success: false, error: "İlan detayı getirilirken teknik bir sorun oluştu." },
      { status: 500 },
    );
  }
}
