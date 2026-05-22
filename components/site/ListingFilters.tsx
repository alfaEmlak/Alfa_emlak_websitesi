"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { kktcCities } from "@/lib/kktc-regions";

type Props = {
  locale: string;
  initial: {
    sehir: string;
    emlak: string;
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

export function ListingFilters({ locale, initial, hidden }: Props) {
  const t = useTranslations("ListingsPage");
  const tc = useTranslations("Common");
  const [emlak, setEmlak] = useState(initial.emlak);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const isKonut = emlak === "konut";
  const isArsa = emlak === "arsa";
  const isTicari = emlak === "ticari";

  // Oda seçimi: "" (tümü) | "0" (stüdyo) | "1".."5" | "custom"
  const ROOM_PRESETS = ["0", "1", "2", "3", "4", "5"];
  const initialOdaMode =
    initial.oda === "" ? "" : ROOM_PRESETS.includes(initial.oda) ? initial.oda : "custom";
  const [odaMode, setOdaMode] = useState(initialOdaMode);
  const [odaCustom, setOdaCustom] = useState(initialOdaMode === "custom" ? initial.oda : "");

  const activeCount =
    (initial.sehir ? 1 : 0) +
    (initial.emlak ? 1 : 0) +
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
          <label className={labelCls}>{t("filters.city")}</label>
          <select name="sehir" defaultValue={initial.sehir} className={fieldCls}>
            <option value="">{t("filters.cityAll")}</option>
            {kktcCities.filter((c) => c.v).map((c) => (
              <option key={c.v} value={c.v}>
                {c.l}
              </option>
            ))}
          </select>
        </div>

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

      {/* Kategori */}
      <div>
        <label className={labelCls}>{t("filters.category")}</label>
        <select
          name="emlak"
          value={emlak}
          onChange={(e) => setEmlak(e.target.value)}
          className={fieldCls}
        >
          <option value="">{t("filters.propertyTypeAll")}</option>
          <option value="konut">{t("filters.konut")}</option>
          <option value="arsa">{t("filters.arsa")}</option>
          <option value="ticari">{t("filters.ticari")}</option>
        </select>
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
                <label className={labelCls}>{t("filters.rooms")}</label>
                <select
                  value={odaMode}
                  onChange={(e) => setOdaMode(e.target.value)}
                  className={fieldCls}
                >
                  <option value="">{t("filters.roomsAll")}</option>
                  <option value="0">{t("filters.studio")}</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}+1
                    </option>
                  ))}
                  <option value="custom">{t("filters.roomCustom")}</option>
                </select>
                {odaMode === "custom" ? (
                  <input
                    name="oda"
                    value={odaCustom}
                    onChange={(e) => setOdaCustom(e.target.value)}
                    placeholder={t("filters.roomCustomPlaceholder")}
                    className={`${fieldCls} mt-2`}
                  />
                ) : odaMode !== "" ? (
                  <input type="hidden" name="oda" value={odaMode} />
                ) : null}
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
