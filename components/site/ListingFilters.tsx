"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { kktcCities, kktcRegions } from "@/lib/kktc-regions";

type Props = {
  locale: string;
  initial: {
    sehir: string;
    bolge: string;
    emlak: string;
    altTip: string;
    oda: string;
    minFiyat: string;
    maxFiyat: string;
    minM2: string;
    maxM2: string;
    esyali: boolean;
    q: string;
  };
  hidden: Record<string, string>;
};

const fieldCls =
  "w-full rounded-lg bg-surface-high px-3 py-2.5 text-sm text-primary outline-none ring-1 ring-primary/[0.1] focus:ring-2 focus:ring-primary/30";
const labelCls = "mb-1 block text-xs font-semibold text-on-surface/55";

const ROOM_TYPE_OPTIONS = [
  "1+0","1+1","2+1","2+2","3+1","3+2",
  "4+1","4+2","5","5+1","5+2","5+3","5+4",
  "6+1","6+2","6+3","6+4",
  "7+1","7+2","7+3","8+",
];

export function ListingFilters({ locale, initial, hidden }: Props) {
  const t = useTranslations("ListingsPage");
  const tc = useTranslations("Common");
  const [sehir, setSehir] = useState(initial.sehir);
  const [bolge, setBolge] = useState(initial.bolge);
  const [emlak, setEmlak] = useState(initial.emlak);
  const [altTip, setAltTip] = useState(initial.altTip);
  const [selectedOda, setSelectedOda] = useState(initial.oda);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSehir(initial.sehir);
    setBolge(initial.bolge);
    setEmlak(initial.emlak);
    setAltTip(initial.altTip);
    setSelectedOda(initial.oda);
  }, [initial.sehir, initial.bolge, initial.emlak, initial.altTip, initial.oda]);

  const isKonut = emlak === "konut";
  const isArsa = emlak === "arsa";
  const isTicari = emlak === "ticari";

  const activeCount =
    (initial.sehir ? 1 : 0) +
    (initial.bolge ? 1 : 0) +
    (initial.emlak ? 1 : 0) +
    (initial.altTip ? 1 : 0) +
    (initial.oda ? 1 : 0) +
    (initial.minFiyat ? 1 : 0) +
    (initial.maxFiyat ? 1 : 0) +
    (initial.minM2 ? 1 : 0) +
    (initial.maxM2 ? 1 : 0) +
    (initial.esyali ? 1 : 0) +
    (initial.q ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg bg-surface-high px-4 py-2.5 text-sm font-semibold text-primary ring-1 ring-primary/[0.1] transition hover:bg-surface-low"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        {t("filters.title")}
        {activeCount > 0 ? (
          <span className="ml-1 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {activeCount}
          </span>
        ) : null}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <form
          action={`/${locale}/ilanlar`}
          method="get"
          className="absolute right-0 z-30 mt-2 flex w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-5 rounded-2xl bg-surface-low p-5 shadow-[var(--shadow-ambient)] ring-1 ring-primary/[0.08]"
        >
      {Object.entries(hidden).map(([k, v]) => (
        <input type="hidden" name={k} value={v} key={k} />
      ))}

      {/* Ana filtreler */}
      <div className="space-y-3">
        <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-primary">
          {t("filters.mainFilters")}
        </h3>

        <div>
          <label className={labelCls}>{t("filters.category")}</label>
          <select
            name="emlak"
            value={emlak}
            onChange={(e) => {
              const val = e.target.value;
              setEmlak(val);
              if (val !== "arsa") {
                setAltTip("");
              }
            }}
            className={fieldCls}
          >
            <option value="">{t("filters.propertyTypeAll")}</option>
            <option value="konut">{t("filters.konut")}</option>
            <option value="arsa">{t("filters.arsa")}</option>
            <option value="ticari">{t("filters.ticari")}</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>{t("filters.city")}</label>
          <select
            name="sehir"
            value={sehir}
            onChange={(e) => {
              const val = e.target.value;
              setSehir(val);
              setBolge("");
            }}
            className={fieldCls}
          >
            <option value="">{t("filters.cityAll")}</option>
            {kktcCities.filter((c) => c.v).map((c) => (
              <option key={c.v} value={c.v}>
                {c.l}
              </option>
            ))}
          </select>
        </div>

        {sehir && kktcRegions[sehir]?.length > 0 ? (
          <div>
            <label className={labelCls}>{t("filters.region") || "Bölge"}</label>
            <select
              name="bolge"
              value={bolge}
              onChange={(e) => setBolge(e.target.value)}
              className={fieldCls}
            >
              <option value="">Tüm Bölgeler</option>
              {kktcRegions[sehir].map((r) => (
                <option key={r.v} value={r.v}>
                  {r.l}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>{t("filters.minPrice")}</label>
            <input
              name="minFiyat"
              type="number"
              min="0"
              defaultValue={initial.minFiyat}
              placeholder={t("filters.minPrice")}
              className={fieldCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t("filters.maxPrice")}</label>
            <input
              name="maxFiyat"
              type="number"
              min="0"
              defaultValue={initial.maxFiyat}
              placeholder={t("filters.maxPrice")}
              className={fieldCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>{tc("search")}</label>
          <input name="q" defaultValue={initial.q} placeholder={tc("search")} className={fieldCls} />
        </div>
      </div>

      {/* Kategoriye özel filtreler */}
      {isKonut || isArsa || isTicari ? (
        <div className="space-y-3 border-t border-primary/10 pt-4">
          <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-primary">
            {t("filters.categoryFilters")}
          </h3>

          {isKonut ? (
            <>
              <div>
                <label className={labelCls}>Oda Tipi</label>
                <select
                  name="oda"
                  value={selectedOda}
                  onChange={(e) => setSelectedOda(e.target.value)}
                  className={fieldCls}
                >
                  <option value="">Tümü</option>
                  {ROOM_TYPE_OPTIONS.map((rt) => (
                    <option key={rt} value={rt}>{rt}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 rounded-lg bg-surface-high px-3 py-2.5 text-sm text-primary ring-1 ring-primary/[0.1]">
                <input
                  name="esyali"
                  type="checkbox"
                  value="1"
                  defaultChecked={initial.esyali}
                  className="size-4 accent-secondary"
                />
                {t("filters.furnished")}
              </label>
            </>
          ) : null}

          {isArsa ? (
            <div>
              <label className={labelCls}>{t("filters.arsaType") || "Arsa Tipi"}</label>
              <select
                name="altTip"
                value={altTip}
                onChange={(e) => setAltTip(e.target.value)}
                className={fieldCls}
              >
                <option value="">Tüm Tipler</option>
                <option value="konutImarli">Konut İmarlı</option>
                <option value="ticariImarli">Ticari İmarlı</option>
                <option value="konutTicariImarli">Konut + Ticari İmarlı</option>
                <option value="tarla">Tarla</option>
                <option value="sanayiArsasi">Sanayi Arsası</option>
                <option value="bagBahce">Bağ &amp; Bahçe</option>
              </select>
            </div>
          ) : null}

          {isArsa || isTicari ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>{t("filters.minArea")}</label>
                <input
                  name="minM2"
                  type="number"
                  min="0"
                  defaultValue={initial.minM2}
                  placeholder={t("filters.minArea")}
                  className={fieldCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t("filters.maxArea")}</label>
                <input
                  name="maxM2"
                  type="number"
                  min="0"
                  defaultValue={initial.maxM2}
                  placeholder={t("filters.maxArea")}
                  className={fieldCls}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

          <button
            type="submit"
            className="btn-primary-gradient rounded-lg px-6 py-3 font-headline text-xs font-bold uppercase tracking-widest text-white"
          >
            {t("filters.apply")}
          </button>
        </form>
      ) : null}
    </div>
  );
}
