"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { formatMoney } from "@/lib/listing-utils";
import {
  computeAllConversions,
  isFxSupportedCurrency,
  type DovizApiWire,
} from "@/lib/sundoviz-convert";

const ORDER: ("TRY" | "USD" | "EUR" | "GBP")[] = ["TRY", "EUR", "USD", "GBP"];

type Props = {
  price: number;
  currency: string;
  /** Büyük ilan detay başlığı */
  variant?: "detail" | "card" | "hero";
  /** Fiyatın altında gösterilecek küçük not (ör. "dönüm fiyatı") */
  note?: string;
};

export function ListingPriceWithFx({ price, currency, variant = "card", note }: Props) {
  const t = useTranslations("Common");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<DovizApiWire | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const supported = isFxSupportedCurrency(currency);

  const load = useCallback(async () => {
    if (data) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/doviz");
      const json = (await res.json()) as DovizApiWire;
      if (!res.ok || !json.usd?.satis || json.usd.satis === "0") throw new Error("invalid");
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [data]);

  const onToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && supported) void load();
  };

  const cur = (currency || "EUR").toUpperCase();
  const amounts = data && supported ? computeAllConversions(price, cur, data) : null;

  const priceClass =
    variant === "detail"
      ? "font-headline text-3xl font-extrabold text-secondary md:text-4xl"
      : variant === "hero"
        ? "font-headline text-lg font-bold text-secondary"
        : "font-headline text-lg font-extrabold text-primary";

  const btnTone =
    variant === "hero"
      ? "text-sky-100/85 underline decoration-dotted underline-offset-2 hover:text-white"
      : "text-secondary underline decoration-dotted underline-offset-2 hover:text-primary";

  const panelTone =
    variant === "hero"
      ? "rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-sky-50 shadow-lg backdrop-blur-md"
      : "rounded-xl border border-primary/10 bg-surface-lowest px-3 py-2 text-primary shadow-[var(--shadow-ambient)]";

  const noteClass = variant === "hero" ? "text-sky-100/60" : "text-on-surface/45";
  const errClass = variant === "hero" ? "text-rose-200" : "text-red-600";
  const waitClass = variant === "hero" ? "text-sky-100/70" : "text-on-surface/50";
  const unsupClass = variant === "hero" ? "text-sky-100/75" : "text-on-surface/55";
  const rowDim = variant === "hero" ? "text-sky-100/80" : "text-on-surface/80";
  const rowTag = variant === "hero" ? "text-sky-100/50" : "text-on-surface/45";

  return (
    <div className={variant === "detail" ? "flex w-full flex-col items-stretch gap-1 sm:items-end sm:text-right" : ""}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={priceClass}>{formatMoney(price, currency)}</span>
        <button
          type="button"
          onClick={onToggle}
          className={`whitespace-nowrap text-xs font-semibold ${btnTone}`}
          aria-expanded={open}
        >
          {t("fxConvert")}
        </button>
      </div>
      {note ? (
        <span className={`text-xs font-medium ${variant === "hero" ? "text-sky-100/70" : "text-on-surface/55"}`}>
          {note}
        </span>
      ) : null}
      {open ? (
        <div className={variant === "detail" ? "mt-1 w-full max-w-[18rem] sm:ml-auto" : "mt-1 w-full max-w-[17rem]"}>
          {!supported ? (
            <p className={`text-xs ${unsupClass} ${panelTone}`}>{t("fxUnsupported")}</p>
          ) : loading ? (
            <p className={`text-xs ${waitClass} ${panelTone}`}>{t("fxLoading")}</p>
          ) : error ? (
            <p className={`text-xs ${errClass} ${panelTone}`}>{t("fxLoadError")}</p>
          ) : amounts ? (
            <>
              <ul className={`space-y-1 text-sm tabular-nums ${panelTone}`}>
                {ORDER.map((code) => (
                  <li
                    key={code}
                    className={`flex justify-between gap-4 ${code === cur ? "font-semibold text-secondary" : rowDim}`}
                  >
                    <span>{code}</span>
                    <span>
                      {formatMoney(amounts[code], code)}
                      {code === cur ? (
                        <span className={`ml-1 text-[10px] font-normal normal-case ${rowTag}`}>
                          ({t("fxListingCurrency")})
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
              <p className={`mt-1.5 text-[10px] leading-snug ${noteClass}`}>{t("fxRatesNote")}</p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
