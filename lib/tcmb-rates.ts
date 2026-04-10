const TCMB_TODAY_XML = "https://www.tcmb.gov.tr/kurlar/today.xml";

/** TCMB tablosunda gösterilecek kodlar (sıra ile). */
export const TCMB_DISPLAY_CODES = [
  "USD",
  "EUR",
  "GBP",
  "CHF",
  "AUD",
  "CAD",
  "SAR",
  "JPY",
] as const;

/** TCMB uses dot as decimal separator in XML. */
function parseTcmbNumber(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (!s) return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function currencyBlock(xml: string, kod: string): string | null {
  const re = new RegExp(
    `<Currency[^>]*\\bKod="${kod}"[^>]*>([\\s\\S]*?)</Currency>`,
    "i",
  );
  const m = xml.match(re);
  return m?.[1] ?? null;
}

/** Prefer ForexSelling (efektif satış); fallback BanknoteSelling. */
function rateFromBlock(block: string): number | null {
  const fs = block.match(/<ForexSelling>([^<]*)<\/ForexSelling>/i);
  if (fs?.[1]) {
    const n = parseTcmbNumber(fs[1]);
    if (n != null) return n;
  }
  const bs = block.match(/<BanknoteSelling>([^<]*)<\/BanknoteSelling>/i);
  if (bs?.[1]) return parseTcmbNumber(bs[1]);
  return null;
}

function unitFromBlock(block: string): number {
  const um = block.match(/<Unit>([^<]*)<\/Unit>/i);
  if (!um?.[1]) return 1;
  const n = Number.parseFloat(um[1].trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export type TcmbRateEntry = {
  code: string;
  /** TCMB’nin verdiği TL tutarı (yabancı `unit` birimi için) */
  rateTl: number;
  /** Genelde 1; JPY için 100 */
  unit: number;
};

export type TcmbDailyRates = {
  tarih: string;
  entries: TcmbRateEntry[];
};

/**
 * Fetches official TCMB daily FX table. Cached server-side (ISR).
 * Not real-time; one official row per business day.
 */
export async function getTcmbDailyRates(): Promise<TcmbDailyRates | null> {
  try {
    const res = await fetch(TCMB_TODAY_XML, {
      next: { revalidate: 14_400 },
      headers: { Accept: "application/xml, text/xml;q=0.9" },
    });
    if (!res.ok) return null;
    const xml = await res.text();

    const dateM = xml.match(/<Tarih_Date[^>]*\bTarih="([^"]*)"/i);
    const tarih = dateM?.[1]?.trim() ?? "";

    const entries: TcmbRateEntry[] = [];
    for (const kod of TCMB_DISPLAY_CODES) {
      const block = currencyBlock(xml, kod);
      if (!block) continue;
      const rateTl = rateFromBlock(block);
      if (rateTl == null) continue;
      const unit = unitFromBlock(block);
      entries.push({ code: kod, rateTl, unit });
    }

    if (!entries.length) return null;

    return { tarih, entries };
  } catch {
    return null;
  }
}
