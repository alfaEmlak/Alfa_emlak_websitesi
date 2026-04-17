/**
 * Sundoviz.com döviz kuru veri tipi
 */
export interface SundovizRate {
  alis: string;
  satis: string;
}

export interface SundovizData {
  usd: SundovizRate;
  eur: SundovizRate;
  gbp: SundovizRate;
  updateTime: string | null;
  source: string;
}

const SUNDOVIZ_API = "https://online.sundoviz.com/services/apirates.php?app=online";

/**
 * Fetches live exchange rates from sundoviz.com (KKTC döviz bürosu)
 * ISR cached for 5 minutes
 */
export async function getSundovizRates(): Promise<SundovizData | null> {
  try {
    const res = await fetch(SUNDOVIZ_API, {
      next: { revalidate: 300 }, // 5 dakika cache
      headers: { "User-Agent": "AlfaEmlak/1.0" },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const kur = data?.online?.kur || data?.gise?.kur;
    const updateTime: string | null = data?.exra?.update_time || null;

    if (!kur) return null;

    return {
      usd: { alis: kur.usd_alis, satis: kur.usd_satis },
      eur: { alis: kur.eur_alis, satis: kur.eur_satis },
      gbp: { alis: kur.gbp_alis, satis: kur.gbp_satis },
      updateTime,
      source: "sundoviz.com",
    };
  } catch (e) {
    console.error("[getSundovizRates]", e);
    return null;
  }
}
