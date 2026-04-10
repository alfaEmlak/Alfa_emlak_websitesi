import Link from "next/link";
import { PropertyCard } from "@/components/site/PropertyCard";
import {
  buildListingFilters,
  countPublishedSafe,
  findPublishedListingsSafe,
} from "@/lib/listings-query";
import { listingKindLabel } from "@/lib/listing-kinds";

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined) {
  if (Array.isArray(v)) return v[0];
  return v;
}

function buildPageHref(sp: SearchParams, page: number) {
  const p = new URLSearchParams();
  for (const [k, val] of Object.entries(sp)) {
    if (val == null || k === "page") continue;
    if (Array.isArray(val)) val.forEach((x) => p.append(k, x));
    else p.set(k, val);
  }
  if (page > 1) p.set("page", String(page));
  const q = p.toString();
  return q ? `/ilanlar?${q}` : "/ilanlar";
}

export default async function ListingsPage(props: { searchParams: Promise<SearchParams> }) {
  const sp = await props.searchParams;
  const where = buildListingFilters(sp);
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const pageSize = 12;
  const [items, total] = await Promise.all([
    findPublishedListingsSafe(where, pageSize, (page - 1) * pageSize),
    countPublishedSafe(where),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const tur = first(sp.tur) || "";
  const kindLabel = (() => {
    if (tur === "satilik") return listingKindLabel("SATILIK");
    if (tur === "kiralik") return listingKindLabel("KIRALIK");
    if (tur === "gunluk") return listingKindLabel("GUNLUK_KIRALIK");
    if (tur === "proje") return listingKindLabel("PROJE");
    return "Portföy";
  })();

  return (
    <main className="mx-auto max-w-[1440px] flex-1 bg-surface px-6 py-12 md:px-8 md:py-16">
      <nav className="font-headline text-xs uppercase tracking-widest text-on-surface/45">
        <Link href="/" className="transition-colors hover:text-secondary">
          Ana Sayfa
        </Link>
        <span className="mx-2">/</span>
        <span className="text-primary">{kindLabel}</span>
      </nav>
      <div className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <span className="label-sm mb-2 block text-secondary" style={{ fontSize: "11px", letterSpacing: "0.12em" }}>
            Koleksiyon
          </span>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary md:text-5xl">{kindLabel}</h1>
          <p className="mt-2 text-sm text-on-surface/50">
            {total} ilan
            {typeof first(sp.sehir) === "string" && first(sp.sehir) ? ` · ${first(sp.sehir)}` : null}
          </p>
        </div>
        <form className="flex flex-wrap gap-2" action="/ilanlar" method="get">
          {Object.entries(sp).map(([k, v]) => {
            if (v == null || k === "q" || k === "page") return null;
            if (Array.isArray(v)) {
              return v.map((x) => <input type="hidden" key={k + x} name={k} value={x} />);
            }
            return <input type="hidden" key={k} name={k} value={v} />;
          })}
          <input
            name="q"
            defaultValue={first(sp.q) ?? ""}
            placeholder="Başlık veya ilan no"
            className="min-w-[200px] rounded-lg bg-surface-high px-4 py-3 text-sm text-primary outline-none ring-1 ring-primary/[0.1] transition-shadow focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            className="btn-primary-gradient rounded-lg px-6 py-3 font-headline text-xs font-bold uppercase tracking-widest text-white"
          >
            Ara
          </button>
        </form>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
        {items.map((l, i) => (
          <PropertyCard key={l.id} listing={l} stagger={i % 3 === 1} />
        ))}
      </div>
      {items.length === 0 ? (
        <p className="mt-20 text-center text-on-surface/50">Bu kriterlere uygun ilan bulunamadı.</p>
      ) : null}
      <div className="mt-16 flex justify-center gap-3">
        {page > 1 ? (
          <Link
            className="rounded-lg bg-surface-low px-5 py-2 font-headline text-sm font-semibold text-primary shadow-[var(--shadow-ambient)] ring-1 ring-primary/[0.1] transition hover:bg-surface-high"
            href={buildPageHref(sp, page - 1)}
          >
            Önceki
          </Link>
        ) : null}
        <span className="px-4 py-2 text-sm text-on-surface/50">
          {page} / {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            className="rounded-lg bg-surface-low px-5 py-2 font-headline text-sm font-semibold text-primary shadow-[var(--shadow-ambient)] ring-1 ring-primary/[0.1] transition hover:bg-surface-high"
            href={buildPageHref(sp, page + 1)}
          >
            Sonraki
          </Link>
        ) : null}
      </div>
    </main>
  );
}
