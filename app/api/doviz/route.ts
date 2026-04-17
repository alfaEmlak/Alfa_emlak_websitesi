import { NextResponse } from "next/server";

const SUNDOVIZ_API = "https://online.sundoviz.com/services/apirates.php?app=online";

// Fallback values if API fails
const FALLBACK = {
  usd: { alis: "0", satis: "0" },
  eur: { alis: "0", satis: "0" },
  gbp: { alis: "0", satis: "0" },
  updateTime: null as string | null,
  source: "sundoviz.com",
};

export async function GET() {
  try {
    const res = await fetch(SUNDOVIZ_API, {
      next: { revalidate: 300 }, // 5 minutes ISR cache
      headers: { "User-Agent": "AlfaEmlak/1.0" },
    });

    if (!res.ok) throw new Error(`Sundoviz API ${res.status}`);

    const data = await res.json();
    const kur = data?.online?.kur || data?.gise?.kur;
    const updateTime = data?.exra?.update_time || null;

    if (!kur) throw new Error("No kur data in response");

    return NextResponse.json(
      {
        usd: { alis: kur.usd_alis, satis: kur.usd_satis },
        eur: { alis: kur.eur_alis, satis: kur.eur_satis },
        gbp: { alis: kur.gbp_alis, satis: kur.gbp_satis },
        updateTime,
        source: "sundoviz.com",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("[doviz-api]", error);
    return NextResponse.json(FALLBACK, { status: 200 });
  }
}
