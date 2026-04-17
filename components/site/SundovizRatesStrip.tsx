"use client";

import type { SundovizData } from "@/lib/sundoviz-rates";
import { useEffect, useState } from "react";

const fmt = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currencies = [
  { code: "USD", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", symbol: "£", flag: "🇬🇧" },
] as const;

type Props = { initialData: SundovizData };

export function SundovizRatesStrip({ initialData }: Props) {
  const [data, setData] = useState<SundovizData>(initialData);

  // Auto-refresh every 5 minutes on client side
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/doviz");
        if (res.ok) {
          const fresh = await res.json();
          if (fresh.usd?.satis !== "0") setData(fresh);
        }
      } catch { /* silent */ }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const rateMap: Record<string, { alis: string; satis: string }> = {
    USD: data.usd,
    EUR: data.eur,
    GBP: data.gbp,
  };

  const updateTime = data.updateTime
    ? new Date(data.updateTime.replace(" ", "T") + "+03:00").toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <section
      aria-label="Güncel döviz kurları"
      className="relative overflow-hidden border-b border-primary/10 bg-gradient-to-r from-primary/[0.06] via-primary/[0.03] to-primary/[0.06]"
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-3 md:px-8">
        {/* Left: Source label */}
        <div className="hidden items-center gap-2 sm:flex">
          <div className="flex h-6 items-center gap-1 rounded-full bg-primary/10 px-2.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-secondary">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/>
            </svg>
            <span className="font-headline text-[10px] font-bold uppercase tracking-wider text-primary/60">
              Anlık Kur
            </span>
          </div>
        </div>

        {/* Center: Rates */}
        <ul className="flex flex-1 flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:gap-x-8 md:gap-x-10">
          {currencies.map(({ code, symbol, flag }) => {
            const rate = rateMap[code];
            if (!rate) return null;
            const satis = parseFloat(rate.satis);

            return (
              <li key={code} className="flex items-center gap-2.5">
                <span className="text-base leading-none">{flag}</span>
                <span className="font-headline text-xs font-bold tracking-wider text-secondary">
                  {code}
                </span>
                <span className="font-sans tabular-nums text-sm font-semibold text-primary">
                  {fmt.format(satis)} ₺
                </span>
              </li>
            );
          })}
        </ul>

        {/* Right: Time + Source */}
        <div className="hidden items-center gap-2 text-[10px] text-primary/40 sm:flex">
          {updateTime && (
            <span className="tabular-nums">
              {updateTime}
            </span>
          )}
          <a
            href="https://www.sundoviz.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline decoration-dotted underline-offset-2 transition-colors hover:text-secondary"
          >
            sundoviz.com
          </a>
        </div>
      </div>
    </section>
  );
}
