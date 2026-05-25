import { NextResponse } from "next/server";
import { getTcmbDailyRates } from "@/lib/tcmb-rates";

const SUNDOVIZ_API = "https://online.sundoviz.com/services/apirates.php?app=online";

/** /api/doviz yanıt tipi — `satis` = 1 birim döviz için TL. */
type DovizWire = {
  usd: { alis: string; satis: string };
  eur: { alis: string; satis: string };
  gbp: { alis: string; satis: string };
  updateTime: string | null;
  source: string;
};

// Tüm kaynaklar başarısız olursa dönen son çare (UI "Kurlar yüklenmedi" gösterir).
const FALLBACK: DovizWire = {
  usd: { alis: "0", satis: "0" },
  eur: { alis: "0", satis: "0" },
  gbp: { alis: "0", satis: "0" },
  updateTime: null,
  source: "none",
};

function isValidWire(w: DovizWire | null): w is DovizWire {
  return !!w && !!w.usd?.satis && w.usd.satis !== "0";
}

const fmt = (n: number) => n.toFixed(4);

/**
 * 1. tercih — Sundoviz (KKTC döviz bürosu satış kuru). En doğru kaynak; ancak
 * yabancı/datacenter IP'lerini (örn. Render) 403 ile engelleyebilir.
 */
async function fromSundoviz(): Promise<DovizWire | null> {
  try {
    const res = await fetch(SUNDOVIZ_API, {
      next: { revalidate: 300 },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        Referer: "https://online.sundoviz.com/",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const kur = data?.online?.kur || data?.gise?.kur;
    if (!kur?.usd_satis) return null;
    return {
      usd: { alis: kur.usd_alis, satis: kur.usd_satis },
      eur: { alis: kur.eur_alis, satis: kur.eur_satis },
      gbp: { alis: kur.gbp_alis, satis: kur.gbp_satis },
      updateTime: data?.exra?.update_time || null,
      source: "sundoviz.com",
    };
  } catch (e) {
    console.error("[doviz-api] sundoviz:", e);
    return null;
  }
}

/**
 * 2. tercih — TCMB (resmi TR kuru, KKTC resmi kuruna en yakın güvenilir kaynak).
 * Küresel erişime açık; Render'dan da çekilebilir.
 */
async function fromTcmb(): Promise<DovizWire | null> {
  const t = await getTcmbDailyRates();
  if (!t) return null;
  const perUnit = (code: string): number | null => {
    const e = t.entries.find((x) => x.code === code);
    if (!e || !(e.unit > 0)) return null;
    return e.rateTl / e.unit;
  };
  const usd = perUnit("USD");
  const eur = perUnit("EUR");
  const gbp = perUnit("GBP");
  if (usd == null || eur == null || gbp == null) return null;
  return {
    usd: { alis: fmt(usd), satis: fmt(usd) },
    eur: { alis: fmt(eur), satis: fmt(eur) },
    gbp: { alis: fmt(gbp), satis: fmt(gbp) },
    updateTime: t.tarih || null,
    source: "tcmb.gov.tr",
  };
}

/**
 * 3. tercih — er-api (anahtarsız küresel kaynak). base=TRY → 1 TL için döviz;
 * 1 birim döviz için TL = 1 / (döviz/TRY).
 */
async function fromErApi(): Promise<DovizWire | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/TRY", {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const j = await res.json();
    const r = j?.rates;
    if (!r?.USD || !r?.EUR || !r?.GBP) return null;
    const usd = 1 / Number(r.USD);
    const eur = 1 / Number(r.EUR);
    const gbp = 1 / Number(r.GBP);
    if (![usd, eur, gbp].every((n) => Number.isFinite(n) && n > 0)) return null;
    return {
      usd: { alis: fmt(usd), satis: fmt(usd) },
      eur: { alis: fmt(eur), satis: fmt(eur) },
      gbp: { alis: fmt(gbp), satis: fmt(gbp) },
      updateTime: j?.time_last_update_utc || null,
      source: "er-api.com",
    };
  } catch (e) {
    console.error("[doviz-api] er-api:", e);
    return null;
  }
}

export async function GET() {
  for (const source of [fromSundoviz, fromTcmb, fromErApi]) {
    const wire = await source();
    if (isValidWire(wire)) {
      return NextResponse.json(wire, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      });
    }
  }

  console.error("[doviz-api] tüm kur kaynakları başarısız");
  return NextResponse.json(FALLBACK, { status: 200 });
}
