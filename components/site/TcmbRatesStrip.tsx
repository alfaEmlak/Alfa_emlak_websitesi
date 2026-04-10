import type { TcmbDailyRates } from "@/lib/tcmb-rates";

const fmt = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

type Props = { data: TcmbDailyRates };

/** Hero görselinin hemen altında, tam genişlik şerit */
export function TcmbRatesStrip({ data }: Props) {
  const { entries } = data;
  if (!entries.length) return null;

  return (
    <section
      aria-label="TCMB günlük döviz kurları"
      className="border-b border-primary/10 bg-primary/[0.04] px-6 py-3 md:px-8"
    >
      <p className="sr-only">
        Gösterilen değerler TCMB efektif satış kurlarıdır; resmi günlük tablodur. JPY için tutar genelde 100 yen içindir.
      </p>
      <div className="mx-auto flex max-w-[1440px] justify-center">
        <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-sans text-sm text-primary">
          {entries.map((e) => (
            <li key={e.code} className="flex items-baseline gap-1.5" title={e.unit !== 1 ? `${e.unit} ${e.code} için TL` : undefined}>
              <span className="font-headline text-xs font-bold tracking-wider text-secondary">
                {e.unit !== 1 ? `${e.unit} ${e.code}` : e.code}
              </span>
              <span className="tabular-nums">{fmt.format(e.rateTl)} ₺</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
