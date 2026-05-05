"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { kktcCities, kktcRegions } from "@/lib/kktc-regions";
import { LISTING_SUBTYPE_MAP, type ListingCategoryKey } from "@/lib/listing-property-taxonomy";

const tabIds = [
  { id: "SATILIK", tur: "satilik", key: "sale" },
  { id: "PROJE", tur: "proje", key: "project" },
  { id: "KIRALIK", tur: "kiralik", key: "rent" },
  { id: "GUNLUK", tur: "gunluk", key: "daily" },
] as const;

const heatingKeys = ["ac", "central", "floor", "stove", "combi"] as const;
const featureKeys = ["balcony", "parking", "elevator", "security", "pool"] as const;
const rooms = ["1+0", "1+1", "2+1", "3+1", "4+1", "5+"];

type Option = { v: string; l: string };

function DropdownField({
  label,
  options,
  value,
  onChange,
  isOverlay,
}: {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  isOverlay: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.v === value)?.l ?? options[0]?.l ?? "";

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const labelCls = isOverlay
    ? "mb-1.5 block text-[11px] font-headline font-bold uppercase tracking-[0.08em] text-white/55"
    : "mb-1.5 block text-[11px] font-headline font-bold uppercase tracking-[0.08em] text-on-surface/45";

  return (
    <div ref={rootRef} className="relative">
      <span className={labelCls}>{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-3 rounded text-left font-headline text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 ${
          isOverlay ? "text-white" : "text-primary"
        }`}
      >
        <span className="truncate">{selected}</span>
        <span className={`text-sm transition-transform ${open ? "rotate-180" : ""} ${isOverlay ? "text-white/70" : "text-primary/60"}`}>
          ▼
        </span>
      </button>

      {open ? (
        <ul
          role="listbox"
          className={`absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 max-h-60 overflow-auto rounded-xl border p-1 shadow-[0_12px_30px_rgba(4,21,70,0.18)] ${
            isOverlay ? "border-white/25 bg-primary/95" : "border-slate-200 bg-white"
          }`}
        >
          {options.map((o) => {
            const active = o.v === value;
            return (
              <li key={o.v + o.l}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(o.v);
                    setOpen(false);
                  }}
                  className={`w-full rounded-lg px-3 py-2.5 text-left text-base transition ${
                    active
                      ? isOverlay
                        ? "bg-white/20 text-white"
                        : "bg-primary/10 text-primary"
                      : isOverlay
                        ? "text-white/90 hover:bg-white/10"
                        : "text-primary/85 hover:bg-slate-100"
                  }`}
                >
                  {o.l}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function HeroSearch({ variant = "light" }: { variant?: "light" | "overlay" }) {
  const router = useRouter();
  const t = useTranslations("HeroSearch");

  const [tab, setTab] = useState<(typeof tabIds)[number]["id"]>("SATILIK");
  const [kategori, setKategori] = useState("");
  const [emlakTipi, setEmlakTipi] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");

  // Advanced filters state
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [roomCount, setRoomCount] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [heating, setHeating] = useState("");
  const [furnished, setFurnished] = useState(false);
  const [m2Min, setM2Min] = useState("");
  const [m2Max, setM2Max] = useState("");

  const categories: Option[] = [
    { v: "", l: t("selectCategory") },
    { v: "konut", l: t("catKonut") },
    { v: "arsa", l: t("catArsa") },
    { v: "ticari", l: t("catTicari") },
    { v: "proje", l: t("catProje") },
  ];

  const emlakTipiOptions: Option[] = kategori
    ? [
        { v: "", l: t("allSubTypes") },
        ...(LISTING_SUBTYPE_MAP[kategori as ListingCategoryKey] ?? []).map((key) => ({ v: key, l: t(`subTypes.${key}`) })),
      ]
    : [{ v: "", l: t("selectCategoryFirst") }];

  const onSearch = () => {
    const tDef = tabIds.find((x) => x.id === tab);
    const turParam = tDef?.tur ?? "satilik";
    const p = new URLSearchParams();
    p.set("tur", turParam);
    if (kategori) p.set("emlak", kategori);
    if (emlakTipi) p.set("tip", emlakTipi);
    if (city) p.set("sehir", city);
    if (region) p.set("bolge", region);
    if (budgetMin.trim()) p.set("minFiyat", budgetMin.replace(/\D/g, ""));
    if (budgetMax.trim()) p.set("maxFiyat", budgetMax.replace(/\D/g, ""));

    if (advancedOpen) {
      if (kategori === "konut" || kategori === "") {
        if (roomCount) p.set("oda", roomCount);
        if (heating) p.set("isitma", heating);
        if (furnished) p.set("esyali", "1");
        if (features.length > 0) p.set("ozellikler", features.join(","));
      }
      if (kategori === "arsa" || kategori === "ticari") {
        if (m2Min.trim()) p.set("minM2", m2Min.replace(/\D/g, ""));
        if (m2Max.trim()) p.set("maxM2", m2Max.replace(/\D/g, ""));
      }
    }

    router.push(`/ilanlar?${p.toString()}`);
  };

  useEffect(() => {
    setEmlakTipi("");
  }, [kategori]);

  useEffect(() => {
    setRegion("");
  }, [city]);

  const isOverlay = variant === "overlay";

  const fieldShell = isOverlay
    ? "rounded-xl bg-white/10 px-5 py-4 ring-1 ring-white/20 transition hover:bg-white/15 focus-within:ring-2 focus-within:ring-white/35"
    : "rounded-xl bg-slate-50/90 px-5 py-4 ring-1 ring-slate-200 transition hover:bg-white focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/25";

  const textInputCls = isOverlay
    ? "w-full border-none bg-transparent p-0 font-headline text-base font-semibold text-white outline-none placeholder:text-white/35 focus:ring-0"
    : "w-full border-none bg-transparent p-0 font-headline text-base font-semibold text-primary outline-none placeholder:text-primary/40 focus:ring-0";

  const shell = isOverlay
    ? "w-full rounded-2xl border border-white/15 bg-white/5 p-3 backdrop-blur-md"
    : "w-full rounded-2xl border border-slate-200/90 bg-white p-3 shadow-[var(--shadow-ambient)]";

  const tabBtn = (active: boolean) =>
    active
      ? "flex-1 sm:flex-none whitespace-nowrap rounded-lg sm:rounded-xl bg-secondary px-2 sm:px-6 py-2.5 sm:py-3 font-headline text-[10px] sm:text-sm font-bold uppercase tracking-[0.05em] sm:tracking-[0.12em] text-white shadow-lg shadow-black/30 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      : "flex-1 sm:flex-none whitespace-nowrap rounded-lg sm:rounded-xl border border-white/30 bg-white/15 px-2 sm:px-6 py-2.5 sm:py-3 font-headline text-[10px] sm:text-sm font-bold uppercase tracking-[0.05em] sm:tracking-[0.12em] text-white shadow-sm backdrop-blur-md transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50";

  // Şehir listesini de çevir (placeholder yerine "Şehir seçin")
  const cityOptions: Option[] = [
    { v: "", l: t("selectCity") },
    ...kktcCities.filter((c) => c.v !== "").map((c) => ({ v: c.v, l: c.l })),
  ];

  const regionOptions: Option[] = city
    ? [{ v: "", l: t("allRegions") }, ...(kktcRegions[city] || [])]
    : [{ v: "", l: t("allRegions") }];

  const handleFeatureToggle = (feat: string) => {
    setFeatures((prev) => (prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat]));
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-3 flex flex-wrap justify-center gap-2 px-1 sm:gap-3" role="tablist" aria-label={t("ariaListingType")}>
        {tabIds.map((tDef) => (
          <button
            key={tDef.id}
            type="button"
            role="tab"
            aria-selected={tab === tDef.id}
            onClick={() => setTab(tDef.id)}
            className={tabBtn(tab === tDef.id)}
          >
            {t(`tabs.${tDef.key}`)}
          </button>
        ))}
      </div>

      <div className={shell}>
        <div className="grid grid-cols-1 items-stretch gap-2.5 p-2 sm:gap-3 sm:p-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <div className={fieldShell}>
            <DropdownField label={t("category")} options={categories} value={kategori} onChange={setKategori} isOverlay={isOverlay} />
          </div>
          <div className={`${fieldShell} transition-opacity duration-200 ${kategori ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
            <DropdownField label={t("propertyType")} options={emlakTipiOptions} value={emlakTipi} onChange={setEmlakTipi} isOverlay={isOverlay} />
          </div>
          <div className={fieldShell}>
            <DropdownField label={t("city")} options={cityOptions} value={city} onChange={setCity} isOverlay={isOverlay} />
          </div>
          <div className={fieldShell}>
            <DropdownField label={t("region")} options={regionOptions} value={region} onChange={setRegion} isOverlay={isOverlay} />
          </div>
          <button
            type="button"
            onClick={onSearch}
            className="btn-tactile min-h-[50px] sm:min-h-[58px] rounded-xl bg-secondary py-3 sm:py-5 font-headline text-xs sm:text-sm font-bold uppercase tracking-[0.12em] text-white shadow-lg shadow-secondary/25 transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-secondary/40 md:min-h-0 md:self-stretch md:px-8"
          >
            {t("submit")}
          </button>
        </div>

        {/* Advanced Filter Toggle */}
        <div className="flex justify-center pb-2 pt-1 transition-all">
          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className={`font-headline font-bold text-[11px] uppercase tracking-[0.12em] flex items-center gap-2 transition hover:opacity-80 focus-visible:outline-none ${
              isOverlay ? "text-white/90" : "text-primary/70 hover:text-secondary"
            }`}
          >
            {advancedOpen ? t("advancedHide") : t("advancedShow")}
            <span className={`text-[10px] transition-transform duration-300 ${advancedOpen ? "rotate-180" : ""}`}>▼</span>
          </button>
        </div>

        {/* Expanded Filter Panel */}
        {advancedOpen && (
          <div className={`mt-2 border-t pt-5 pb-2 px-2 sm:px-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
            isOverlay ? "border-white/10" : "border-slate-200"
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
              {/* Fiyat Aralığı */}
              <div className={fieldShell + " !px-4 !py-3"}>
                <span className={isOverlay ? "mb-2 block text-[11px] font-headline font-bold uppercase tracking-[0.08em] text-white/55" : "mb-2 block text-[11px] font-headline font-bold uppercase tracking-[0.08em] text-on-surface/45"}>
                  {t("priceRange")}
                </span>
                <div className="flex items-center gap-2">
                  <input type="text" className={textInputCls + " !text-sm"} placeholder={t("min")} value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
                  <span className={isOverlay ? "text-white/40" : "text-primary/40"}>-</span>
                  <input type="text" className={textInputCls + " !text-sm"} placeholder={t("max")} value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
                </div>
              </div>

              {/* Konut Spesifik Alanlar */}
              {(kategori === "konut" || kategori === "") && (
                <>
                  <div className={fieldShell + " !px-4 !py-3"}>
                    <span className={isOverlay ? "mb-2 block text-[11px] font-headline font-bold uppercase tracking-[0.08em] text-white/55" : "mb-2 block text-[11px] font-headline font-bold uppercase tracking-[0.08em] text-on-surface/45"}>
                      {t("roomCount")}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {rooms.map((room) => {
                        const active = roomCount === room;
                        return (
                          <button
                            key={room}
                            type="button"
                            onClick={() => setRoomCount(active ? "" : room)}
                            className={`px-2 py-1 text-[11px] font-bold rounded transition-colors ${
                              active
                                ? "bg-secondary text-white"
                                : isOverlay
                                  ? "bg-white/10 text-white/80 hover:bg-white/20"
                                  : "bg-primary/5 text-primary hover:bg-primary/10"
                            }`}
                          >
                            {room}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className={fieldShell + " !px-4 !py-3"}>
                    <span className={isOverlay ? "mb-2 block text-[11px] font-headline font-bold uppercase tracking-[0.08em] text-white/55" : "mb-2 block text-[11px] font-headline font-bold uppercase tracking-[0.08em] text-on-surface/45"}>
                      {t("heatingFurniture")}
                    </span>
                    <select
                      className={`${textInputCls} !text-sm mb-3 cursor-pointer`}
                      value={heating}
                      onChange={(e) => setHeating(e.target.value)}
                    >
                      <option value="">{t("heatingSelect")}</option>
                      {heatingKeys.map((h) => (
                        <option key={h} value={t(`heating.${h}`)}>
                          {t(`heating.${h}`)}
                        </option>
                      ))}
                    </select>

                    <label className={`flex items-center gap-2 text-xs font-semibold cursor-pointer ${isOverlay ? "text-white/80" : "text-primary/80"}`}>
                      <input
                        type="checkbox"
                        checked={furnished}
                        onChange={() => setFurnished(!furnished)}
                        className={`rounded bg-transparent text-secondary focus:ring-secondary ${isOverlay ? "border-white/20" : "border-primary/20"}`}
                      />
                      {t("furnished")}
                    </label>
                  </div>

                  <div className={fieldShell + " !px-4 !py-3"}>
                    <span className={isOverlay ? "mb-2 block text-[11px] font-headline font-bold uppercase tracking-[0.08em] text-white/55" : "mb-2 block text-[11px] font-headline font-bold uppercase tracking-[0.08em] text-on-surface/45"}>
                      {t("featuresLabel")}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {featureKeys.map((f) => {
                        const label = t(`features.${f}`);
                        return (
                          <label key={f} className={`flex items-center gap-1.5 text-[11px] font-medium cursor-pointer ${isOverlay ? "text-white/80" : "text-primary/80"}`}>
                            <input
                              type="checkbox"
                              checked={features.includes(label)}
                              onChange={() => handleFeatureToggle(label)}
                              className={`rounded bg-transparent text-secondary focus:ring-secondary ${isOverlay ? "border-white/20" : "border-primary/20"}`}
                            />
                            {label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Arsa / Ticari Spesifik Alanlar */}
              {(kategori === "arsa" || kategori === "ticari") && (
                <div className={fieldShell + " !px-4 !py-3"}>
                  <span className={isOverlay ? "mb-2 block text-[11px] font-headline font-bold uppercase tracking-[0.08em] text-white/55" : "mb-2 block text-[11px] font-headline font-bold uppercase tracking-[0.08em] text-on-surface/45"}>
                    {t("areaRange")}
                  </span>
                  <div className="flex items-center gap-2">
                    <input type="text" className={textInputCls + " !text-sm"} placeholder={`${t("min")} m²`} value={m2Min} onChange={(e) => setM2Min(e.target.value)} />
                    <span className={isOverlay ? "text-white/40" : "text-primary/40"}>-</span>
                    <input type="text" className={textInputCls + " !text-sm"} placeholder={`${t("max")} m²`} value={m2Max} onChange={(e) => setM2Max(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
