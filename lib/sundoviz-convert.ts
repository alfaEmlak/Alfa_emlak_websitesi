/**
 * İlan fiyatını Sundoviz satış kurları üzerinden TRY'ye indirger ve döviz çiftlerine çevirir.
 * Kur anlamı: `satis` = 1 birim yabancı para için TL (ana sayfa kur şeridiyle aynı).
 */

import type { SundovizRate } from "@/lib/sundoviz-rates";

export type DovizApiWire = {
  usd: SundovizRate;
  eur: SundovizRate;
  gbp: SundovizRate;
  updateTime: string | null;
  source: string;
};

const SUPPORTED = new Set(["TRY", "USD", "EUR", "GBP"]);

export function isFxSupportedCurrency(code: string | undefined): boolean {
  if (!code) return false;
  return SUPPORTED.has(code.toUpperCase());
}

export function parseKur(s: string | undefined): number | null {
  if (s == null || s === "") return null;
  const n = parseFloat(String(s).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function tryPerForeignUnit(rates: DovizApiWire): { USD: number; EUR: number; GBP: number } | null {
  const usd = parseKur(rates.usd.satis);
  const eur = parseKur(rates.eur.satis);
  const gbp = parseKur(rates.gbp.satis);
  if (usd == null || eur == null || gbp == null) return null;
  return { USD: usd, EUR: eur, GBP: gbp };
}

/** İlan tutarını TRY cinsine çevirir (Sundoviz satış kuru). */
export function listingAmountToTry(amount: number, listingCurrency: string, rates: DovizApiWire): number | null {
  const cur = listingCurrency.toUpperCase();
  const per = tryPerForeignUnit(rates);
  if (!per) return null;
  if (cur === "TRY") return amount;
  if (cur === "USD") return amount * per.USD;
  if (cur === "EUR") return amount * per.EUR;
  if (cur === "GBP") return amount * per.GBP;
  return null;
}

export type FxCode = "TRY" | "USD" | "EUR" | "GBP";

export function computeAllConversions(
  amount: number,
  listingCurrency: string,
  rates: DovizApiWire,
): Record<FxCode, number> | null {
  const tryAmount = listingAmountToTry(amount, listingCurrency, rates);
  const per = tryPerForeignUnit(rates);
  if (tryAmount == null || !per) return null;
  return {
    TRY: tryAmount,
    USD: tryAmount / per.USD,
    EUR: tryAmount / per.EUR,
    GBP: tryAmount / per.GBP,
  };
}
