import { Link } from "@/i18n/routing";
import { PropertyCard } from "@/components/site/PropertyCard";
import {
  buildListingFilters,
  countPublishedSafe,
  findPublishedListingsSafe,
} from "@/lib/listings-query";
import { getTranslations } from "next-intl/server";
import { getTranslatedListing } from "@/lib/i18n-utils";
import { kktcCities, kktcRegions } from "@/lib/kktc-regions";
import { FilterChip } from "@/components/site/FilterChip";
import { ListingFilters } from "@/components/site/ListingFilters";
import { ListingSort } from "@/components/site/ListingSort";
import { LISTING_SUBTYPE_LABEL_TR } from "@/lib/listing-property-taxonomy";

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
function buildRemoveHref(sp: SearchParams, removeKey: string | string[]) {
  const removeKeys = Array.isArray(removeKey) ? removeKey : [removeKey];
  const p = new URLSearchParams();
  for (const [k, val] of Object.entries(sp)) {
    if (val == null || removeKeys.includes(k) || k === "page") continue;
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
  const sort = first(sp.sirala) ?? "yeni";
  const pageSize = 12;
  const [itemsRaw, total] = await Promise.all([
    findPublishedListingsSafe(where, pageSize, (page - 1) * pageSize, sort),
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

  const activeFilters: { key: string; label: string; value: string; removeKeys?: string[] }[] = [];
  const fCity = first(sp.sehir);
  if (fCity) activeFilters.push({ key: "sehir", label: t("filters.city"), value: kktcCities.find((c) => c.v === fCity)?.l ?? fCity });
  // Bölge çoklu seçilebilir ("bolge=alsancak,lapta"); hepsi tek çipte listelenir.
  const fBolge = first(sp.bolge);
  if (fBolge && fCity) {
    const regLabels = fBolge
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((v) => kktcRegions[fCity]?.find((r) => r.v === v)?.l ?? v);
    if (regLabels.length > 0) {
      activeFilters.push({
        key: "bolge",
        label: t("filters.region") || "Bölge",
        value: regLabels.join(", "),
      });
    }
  }
  const fEmlak = first(sp.emlak);
  if (fEmlak) activeFilters.push({ key: "emlak", label: t("filters.propertyType"), value: emlakLabel(fEmlak) });
  // Alt tip her kategoride geçerli (Konut → Villa, Ticari → Ofis…), sadece arsa değil.
  const fAltTip = first(sp.altTip);
  if (fAltTip) {
    const subLabel = LISTING_SUBTYPE_LABEL_TR[fAltTip] || fAltTip;
    activeFilters.push({
      key: "altTip",
      label: fEmlak === "arsa" ? t("filters.arsaType") || "Arsa Tipi" : t("filters.propertyType"),
      value: subLabel,
    });
  }
  const fOda = first(sp.oda);
  if (fOda) {
    const odaN = parseInt(fOda, 10);
    const odaValue = fOda === "0" ? t("filters.studio") : Number.isFinite(odaN) ? `${odaN}+1` : fOda;
    activeFilters.push({ key: "oda", label: t("filters.rooms"), value: odaValue });
  }
  const fMin = first(sp.minFiyat);
  if (fMin) activeFilters.push({ key: "minFiyat", label: t("filters.minPrice"), value: Number(fMin).toLocaleString(locale) });
  const fMax = first(sp.maxFiyat);
  if (fMax) activeFilters.push({ key: "maxFiyat", label: t("filters.maxPrice"), value: Number(fMax).toLocaleString(locale) });
  const fEsy = first(sp.esyali);
  if (fEsy === "1" || fEsy === "true") activeFilters.push({ key: "esyali", label: t("filters.furnished"), value: "✓" });
  const fQ = first(sp.q);
  if (fQ) activeFilters.push({ key: "q", label: tc("search"), value: fQ });
  const fDanismanAdi = first(sp.danismanAdi);
  const fDanisman = first(sp.danisman);
  if (fDanismanAdi || fDanisman) {
    activeFilters.push({
      key: "danismanAdi",
      label: t("filters.consultant"),
      value: fDanismanAdi ?? fDanisman ?? "",
      removeKeys: ["danisman", "danismanAdi"],
    });
  }

  const clearAllHref = (() => {
    const turv = first(sp.tur);
    return turv ? `/ilanlar?tur=${turv}` : "/ilanlar";
  })();

  // Form'da görünmeyen ama korunması gereken parametreler (gizli input olarak taşınır)
  const visibleFilterKeys = new Set(["q", "sehir", "bolge", "emlak", "altTip", "oda", "minFiyat", "maxFiyat", "minM2", "maxM2", "esyali", "page"]);
  const hiddenParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (v == null || visibleFilterKeys.has(k)) continue;
    const val = first(v);
    if (val != null) hiddenParams[k] = val;
  }
  const filterInitial = {
    sehir: first(sp.sehir) ?? "",
    bolge: first(sp.bolge) ?? "",
    emlak: first(sp.emlak) ?? "",
    altTip: first(sp.altTip) ?? "",
    oda: first(sp.oda) ?? "",
    minFiyat: first(sp.minFiyat) ?? "",
    maxFiyat: first(sp.maxFiyat) ?? "",
    minM2: first(sp.minM2) ?? "",
    maxM2: first(sp.maxM2) ?? "",
    esyali: first(sp.esyali) === "1" || first(sp.esyali) === "true",
    q: first(sp.q) ?? "",
  };

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
      <div className="mt-8">
        <span className="label-sm mb-2 block text-secondary" style={{ fontSize: "11px", letterSpacing: "0.12em" }}>
          {th("featuredLabel")}
        </span>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary md:text-5xl">{kindLabel}</h1>
        <p className="mt-2 text-sm text-on-surface/50">
          {total} {tc("listings").toLowerCase()}
          {typeof first(sp.sehir) === "string" && first(sp.sehir) ? ` · ${first(sp.sehir)}` : null}
        </p>
      </div>

      <div className="mt-8">
        <div className="mb-6 flex items-center justify-end gap-3">
          <ListingFilters locale={locale} initial={filterInitial} hidden={hiddenParams} />
          <ListingSort current={sort} />
        </div>
        <div>
          {activeFilters.length > 0 ? (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {activeFilters.map((f) => (
                <FilterChip
                  key={f.key}
                  label={f.label}
                  value={f.value}
                  removeHref={buildRemoveHref(sp, f.removeKeys ?? f.key)}
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

          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 xl:grid-cols-3 lg:gap-12">
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
        </div>
      </div>
    </main>
  );
}
