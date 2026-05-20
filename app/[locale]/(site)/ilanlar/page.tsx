import { Link } from "@/i18n/routing";
import { PropertyCard } from "@/components/site/PropertyCard";
import {
  buildListingFilters,
  countPublishedSafe,
  findPublishedListingsSafe,
} from "@/lib/listings-query";
import { getTranslations } from "next-intl/server";
import { getTranslatedListing } from "@/lib/i18n-utils";
import { kktcCities } from "@/lib/kktc-regions";
import { FilterChip } from "@/components/site/FilterChip";

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

/** Verilen parametreyi (ve sayfa numarasını) çıkararak URL üretir. */
function buildRemoveHref(sp: SearchParams, removeKey: string) {
  const p = new URLSearchParams();
  for (const [k, val] of Object.entries(sp)) {
    if (val == null || k === removeKey || k === "page") continue;
    if (Array.isArray(val)) val.forEach((x) => p.append(k, x));
    else p.set(k, val);
  }
  const q = p.toString();
  return q ? `/ilanlar?${q}` : "/ilanlar";
}

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}

export default async function ListingsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations("ListingsPage");
  const tc = await getTranslations("Common");
  const th = await getTranslations("HomePage");

  const { where } = buildListingFilters(sp);
  const page = Math.max(1, Number(first(sp.page)) || 1);
  const pageSize = 12;
  const [itemsRaw, total] = await Promise.all([
    findPublishedListingsSafe(where, pageSize, (page - 1) * pageSize),
    countPublishedSafe(where),
  ]);
  
  const items = itemsRaw.map(l => getTranslatedListing(l, locale));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const emlakLabel = (v: string) => {
    if (v === "konut") return t("filters.konut");
    if (v === "ticari") return t("filters.ticari");
    if (v === "arsa") return t("filters.arsa");
    return v;
  };

  const activeFilters: { key: string; label: string; value: string }[] = [];
  const fCity = first(sp.sehir);
  if (fCity) activeFilters.push({ key: "sehir", label: t("filters.city"), value: kktcCities.find((c) => c.v === fCity)?.l ?? fCity });
  const fEmlak = first(sp.emlak);
  if (fEmlak) activeFilters.push({ key: "emlak", label: t("filters.propertyType"), value: emlakLabel(fEmlak) });
  const fOda = first(sp.oda);
  if (fOda) activeFilters.push({ key: "oda", label: t("filters.rooms"), value: `${fOda}+` });
  const fMin = first(sp.minFiyat);
  if (fMin) activeFilters.push({ key: "minFiyat", label: t("filters.minPrice"), value: Number(fMin).toLocaleString(locale) });
  const fMax = first(sp.maxFiyat);
  if (fMax) activeFilters.push({ key: "maxFiyat", label: t("filters.maxPrice"), value: Number(fMax).toLocaleString(locale) });
  const fEsy = first(sp.esyali);
  if (fEsy === "1" || fEsy === "true") activeFilters.push({ key: "esyali", label: t("filters.furnished"), value: "✓" });
  const fQ = first(sp.q);
  if (fQ) activeFilters.push({ key: "q", label: tc("search"), value: fQ });

  const clearAllHref = (() => {
    const turv = first(sp.tur);
    return turv ? `/ilanlar?tur=${turv}` : "/ilanlar";
  })();

  // Form'da görünmeyen ama korunması gereken parametreler (gizli input olarak taşınır)
  const visibleFilterKeys = new Set(["q", "sehir", "emlak", "oda", "minFiyat", "maxFiyat", "esyali", "page"]);

  const tur = first(sp.tur) || "";
  const kindLabel = (() => {
    if (tur === "satilik") return tc("forSale");
    if (tur === "kiralik") return tc("forRent");
    if (tur === "gunluk") return tc("dailyRent");
    if (tur === "proje") return tc("project");
    return t("title");
  })();

  return (
    <main className="mx-auto max-w-[1440px] flex-1 bg-surface px-6 py-12 md:px-8 md:py-16">
      <nav className="font-headline text-xs uppercase tracking-widest text-on-surface/45">
        <Link href="/" className="transition-colors hover:text-secondary">
          {tc("home")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-primary">{kindLabel}</span>
      </nav>
      <div className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <span className="label-sm mb-2 block text-secondary" style={{ fontSize: "11px", letterSpacing: "0.12em" }}>
            {th("featuredLabel")}
          </span>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary md:text-5xl">{kindLabel}</h1>
          <p className="mt-2 text-sm text-on-surface/50">
            {total} {tc("listings").toLowerCase()}
            {typeof first(sp.sehir) === "string" && first(sp.sehir) ? ` · ${first(sp.sehir)}` : null}
          </p>
        </div>
        <form className="flex flex-wrap items-center gap-2" action={`/${locale}/ilanlar`} method="get">
          {Object.entries(sp).map(([k, v]) => {
            if (v == null || visibleFilterKeys.has(k)) return null;
            if (Array.isArray(v)) {
              return v.map((x) => <input type="hidden" key={k + x} name={k} value={x} />);
            }
            return <input type="hidden" key={k} name={k} value={v} />;
          })}
          <select
            name="sehir"
            defaultValue={first(sp.sehir) ?? ""}
            className="rounded-lg bg-surface-high px-3 py-3 text-sm text-primary outline-none ring-1 ring-primary/[0.1] focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{t("filters.cityAll")}</option>
            {kktcCities.filter((c) => c.v).map((c) => (
              <option key={c.v} value={c.v}>{c.l}</option>
            ))}
          </select>
          <select
            name="emlak"
            defaultValue={first(sp.emlak) ?? ""}
            className="rounded-lg bg-surface-high px-3 py-3 text-sm text-primary outline-none ring-1 ring-primary/[0.1] focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{t("filters.propertyTypeAll")}</option>
            <option value="konut">{t("filters.konut")}</option>
            <option value="ticari">{t("filters.ticari")}</option>
            <option value="arsa">{t("filters.arsa")}</option>
          </select>
          <select
            name="oda"
            defaultValue={first(sp.oda) ?? ""}
            className="rounded-lg bg-surface-high px-3 py-3 text-sm text-primary outline-none ring-1 ring-primary/[0.1] focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{t("filters.roomsAll")}</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}+</option>
            ))}
          </select>
          <input
            name="minFiyat"
            type="number"
            min="0"
            defaultValue={first(sp.minFiyat) ?? ""}
            placeholder={t("filters.minPrice")}
            className="w-28 rounded-lg bg-surface-high px-3 py-3 text-sm text-primary outline-none ring-1 ring-primary/[0.1] focus:ring-2 focus:ring-primary/30"
          />
          <input
            name="maxFiyat"
            type="number"
            min="0"
            defaultValue={first(sp.maxFiyat) ?? ""}
            placeholder={t("filters.maxPrice")}
            className="w-28 rounded-lg bg-surface-high px-3 py-3 text-sm text-primary outline-none ring-1 ring-primary/[0.1] focus:ring-2 focus:ring-primary/30"
          />
          <label className="flex items-center gap-2 rounded-lg bg-surface-high px-3 py-3 text-sm text-primary ring-1 ring-primary/[0.1]">
            <input
              name="esyali"
              type="checkbox"
              value="1"
              defaultChecked={first(sp.esyali) === "1" || first(sp.esyali) === "true"}
              className="size-4 accent-secondary"
            />
            {t("filters.furnished")}
          </label>
          <input
            name="q"
            defaultValue={first(sp.q) ?? ""}
            placeholder={tc("search")}
            className="min-w-[160px] flex-1 rounded-lg bg-surface-high px-4 py-3 text-sm text-primary outline-none ring-1 ring-primary/[0.1] transition-shadow focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            className="btn-primary-gradient rounded-lg px-6 py-3 font-headline text-xs font-bold uppercase tracking-widest text-white"
          >
            {t("filters.apply")}
          </button>
        </form>
      </div>

      {activeFilters.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {activeFilters.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              value={f.value}
              removeHref={buildRemoveHref(sp, f.key)}
              removeLabel={t("filters.remove")}
            />
          ))}
          <Link
            href={clearAllHref}
            className="ml-1 text-xs font-medium text-secondary underline-offset-4 hover:underline"
          >
            {t("filters.clearAll")}
          </Link>
        </div>
      ) : null}
      <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
        {items.map((l, i) => (
          <PropertyCard key={l.id} listing={l} stagger={i % 3 === 1} />
        ))}
      </div>
      {items.length === 0 ? (
        <p className="mt-20 text-center text-on-surface/50">{t("noResults")}</p>
      ) : null}
      <div className="mt-16 flex justify-center gap-3">
        {page > 1 ? (
          <Link
            className="rounded-lg bg-surface-low px-5 py-2 font-headline text-sm font-semibold text-primary shadow-[var(--shadow-ambient)] ring-1 ring-primary/[0.1] transition hover:bg-surface-high"
            href={buildPageHref(sp, page - 1)}
          >
            {tc("previous")}
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
            {tc("next")}
          </Link>
        ) : null}
      </div>
    </main>
  );
}
