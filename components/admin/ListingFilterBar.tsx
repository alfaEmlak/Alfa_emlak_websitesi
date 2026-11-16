"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * İlanlar sayfasının filtre çubuğu — "Filtrele" butonu yok; her değişiklik
 * adres satırına yazılır ve sunucu listesi kendiliğinden yenilenir.
 * Açılır listeler anında, metin/fiyat kutuları kısa bir beklemeden sonra uygulanır.
 */

type Option = { value: string; label: string };

export type ListingFilterValues = {
  q: string;
  city: string;
  region: string;
  kind: string;
  propertyType: string;
  status: string;
  agent: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
  view: string;
};

type Props = {
  values: ListingFilterValues;
  cityOptions: Option[];
  regionsByCity: Record<string, Option[]>;
  kindOptions: Option[];
  propertyTypeOptions: Option[];
  agentOptions: Option[] | null;
  statusTabs: { value: string; label: string; count: number }[];
  labels: {
    searchPh: string;
    cityAll: string;
    regionAll: string;
    regionPickCity: string;
    kindAll: string;
    propertyTypeAll: string;
    agentAll: string;
    priceRange: string;
    priceMin: string;
    priceMax: string;
    reset: string;
    viewTable: string;
    viewGrid: string;
    sortUpdated: string;
    sortNewest: string;
    sortPriceAsc: string;
    sortPriceDesc: string;
    updating: string;
  };
};

const TEXT_DEBOUNCE_MS = 400;

const inputCls =
  "min-h-[42px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20";

export function ListingFilterBar({
  values,
  cityOptions,
  regionsByCity,
  kindOptions,
  propertyTypeOptions,
  agentOptions,
  statusTabs,
  labels,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  // Yazılan metin kutuları — sunucu yanıtını beklemeden ekranda kalsın diye yerel.
  const [q, setQ] = useState(values.q);
  const [minPrice, setMinPrice] = useState(values.minPrice);
  const [maxPrice, setMaxPrice] = useState(values.maxPrice);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Geri/ileri gezinme veya sıfırlama sonrası adres değişirse kutuları eşitle
  // (kullanıcı yazarken bekleyen bir gönderim varsa dokunma).
  const urlKey = `${values.q}\u0000${values.minPrice}\u0000${values.maxPrice}`;
  const [syncedKey, setSyncedKey] = useState(urlKey);
  // Kendi gönderdiğimiz değerin geri dönüşü kutuyu ezmesin (kullanıcı bu arada yazmaya devam etmiş olabilir).
  const [lastSent, setLastSent] = useState({ q: values.q, minPrice: values.minPrice, maxPrice: values.maxPrice });
  if (syncedKey !== urlKey) {
    setSyncedKey(urlKey);
    if (values.q !== lastSent.q) setQ(values.q);
    if (values.minPrice !== lastSent.minPrice) setMinPrice(values.minPrice);
    if (values.maxPrice !== lastSent.maxPrice) setMaxPrice(values.maxPrice);
    setLastSent({ q: values.q, minPrice: values.minPrice, maxPrice: values.maxPrice });
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function push(patch: Partial<ListingFilterValues>) {
    // Gecikmeli gönderim eski bir render'ın kapanışından çalışabilir; o arada
    // seçilen diğer filtreler kaybolmasın diye adresi her seferinde canlı oku.
    const live = typeof window !== "undefined" ? window.location.search : `?${searchParams.toString()}`;
    const params = new URLSearchParams(live);
    for (const [key, val] of Object.entries(patch)) {
      if (val) params.set(key, val);
      else params.delete(key);
    }
    // Filtre değişince ilk sayfaya dön; eski tekil kutular da temizlensin.
    params.delete("page");
    params.delete("delete");
    if ("q" in patch) {
      params.delete("listingId");
      params.delete("title");
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function pushDebounced(patch: Partial<ListingFilterValues>) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      setLastSent((prev) => ({ ...prev, ...patch }));
      push(patch);
    }, TEXT_DEBOUNCE_MS);
  }

  function reset() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setQ("");
    setMinPrice("");
    setMaxPrice("");
    const params = new URLSearchParams();
    // Görünüm ve sıralama tercih olduğu için korunur.
    if (values.view) params.set("view", values.view);
    if (values.sort) params.set("sort", values.sort);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  const regions = values.city ? regionsByCity[values.city] ?? [] : [];
  const hasAnyFilter =
    !!(q || minPrice || maxPrice) ||
    !!(values.city || values.region || values.kind || values.propertyType || values.status || values.agent);

  const viewBtn = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
      active ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
    }`;

  return (
    <div className="relative mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      {/* Durum sekmeleri */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 pb-4">
        {statusTabs.map((tab) => {
          const active = values.status === tab.value;
          return (
            <button
              key={tab.value || "all"}
              type="button"
              onClick={() => push({ status: tab.value })}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                active ? "bg-emerald-600 text-white shadow-sm" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {tab.label} <span className={active ? "text-white/80" : "text-zinc-400"}>({tab.count})</span>
            </button>
          );
        })}
        <span
          aria-live="polite"
          className={`ml-auto inline-flex items-center gap-2 text-xs font-medium text-emerald-700 transition-opacity ${
            pending ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          {labels.updating}
        </span>
      </div>

      {/* Arama + açılır listeler */}
      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${agentOptions ? "lg:grid-cols-6" : "lg:grid-cols-5"}`}>
        <div className="relative sm:col-span-2 lg:col-span-2">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.45 4.39l3.08 3.08a.75.75 0 1 1-1.06 1.06l-3.08-3.08A7 7 0 0 1 2 9Z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="search"
            value={q}
            placeholder={labels.searchPh}
            onChange={(e) => {
              setQ(e.target.value);
              pushDebounced({ q: e.target.value.trim() });
            }}
            className={`${inputCls} pl-10`}
          />
        </div>

        <select
          value={values.city}
          onChange={(e) => push({ city: e.target.value, region: "" })}
          className={inputCls}
        >
          <option value="">{labels.cityAll}</option>
          {cityOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={values.region}
          disabled={!values.city}
          onChange={(e) => push({ region: e.target.value })}
          className={`${inputCls} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <option value="">{values.city ? labels.regionAll : labels.regionPickCity}</option>
          {regions.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        <select value={values.propertyType} onChange={(e) => push({ propertyType: e.target.value })} className={inputCls}>
          <option value="">{labels.propertyTypeAll}</option>
          {propertyTypeOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {agentOptions ? (
          <select value={values.agent} onChange={(e) => push({ agent: e.target.value })} className={inputCls}>
            <option value="">{labels.agentAll}</option>
            {agentOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {/* Tür, fiyat, görünüm ve sıralama */}
      <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={values.kind}
            onChange={(e) => push({ kind: e.target.value })}
            className="min-h-[36px] rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium outline-none focus:border-emerald-500"
          >
            <option value="">{labels.kindAll}</option>
            {kindOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="ml-1 text-xs font-semibold text-zinc-500">{labels.priceRange}:</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={minPrice}
            placeholder={labels.priceMin}
            onChange={(e) => {
              setMinPrice(e.target.value);
              pushDebounced({ minPrice: e.target.value.trim(), maxPrice: maxPrice.trim() });
            }}
            className="min-h-[36px] w-28 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
          />
          <span className="text-zinc-400">–</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={maxPrice}
            placeholder={labels.priceMax}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              pushDebounced({ minPrice: minPrice.trim(), maxPrice: e.target.value.trim() });
            }}
            className="min-h-[36px] w-28 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
          />
          {hasAnyFilter ? (
            <button type="button" onClick={reset} className="ml-1 text-xs font-semibold text-rose-600 hover:underline">
              {labels.reset}
            </button>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="flex items-center rounded-xl bg-zinc-100 p-1">
            <button type="button" onClick={() => push({ view: "" })} className={viewBtn(values.view !== "grid")}>
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M3 4.75A.75.75 0 0 1 3.75 4h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 4.75Zm0 5A.75.75 0 0 1 3.75 9h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 9.75Zm0 5a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" />
              </svg>
              {labels.viewTable}
            </button>
            <button type="button" onClick={() => push({ view: "grid" })} className={viewBtn(values.view === "grid")}>
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M3 3h6v6H3V3Zm8 0h6v6h-6V3ZM3 11h6v6H3v-6Zm8 0h6v6h-6v-6Z" />
              </svg>
              {labels.viewGrid}
            </button>
          </div>
          <select
            value={values.sort}
            onChange={(e) => push({ sort: e.target.value })}
            className="min-h-[36px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium outline-none focus:border-emerald-500"
          >
            <option value="">{labels.sortUpdated}</option>
            <option value="newest">{labels.sortNewest}</option>
            <option value="price_asc">{labels.sortPriceAsc}</option>
            <option value="price_desc">{labels.sortPriceDesc}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
