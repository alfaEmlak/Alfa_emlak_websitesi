"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const tabs = [
  { id: "SATILIK", label: "Satılık", tur: "satilik" },
  { id: "PROJE", label: "Projeler", tur: "proje" },
  { id: "KIRALIK", label: "Kiralık", tur: "kiralik" },
  { id: "GUNLUK", label: "Günlük", tur: "gunluk" },
] as const;

const cities = [
  { v: "", l: "Şehir seçin..." },
  { v: "girne", l: "Girne" },
  { v: "magusa", l: "Mağusa" },
  { v: "lefkosa", l: "Lefkoşa" },
  { v: "iskele", l: "İskele" },
  { v: "lefke", l: "Lefke" },
  { v: "guzelyurt", l: "Güzelyurt" },
];

const types = [
  { v: "", l: "Lüks villalar" },
  { v: "konut", l: "Konut / Daire" },
  { v: "ticari", l: "Ticari" },
  { v: "arsa", l: "Arsa / Arazi" },
];

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
        className={`flex w-full items-center justify-between gap-3 text-left font-headline text-base font-semibold ${
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
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("SATILIK");
  const [emlak, setEmlak] = useState("");
  const [city, setCity] = useState("");
  const [budgetMax, setBudgetMax] = useState("");

  const onSearch = () => {
    const t = tabs.find((x) => x.id === tab)?.tur ?? "satilik";
    const p = new URLSearchParams();
    p.set("tur", t);
    if (emlak) p.set("emlak", emlak);
    if (city) p.set("sehir", city);
    if (budgetMax.trim()) p.set("maxFiyat", budgetMax.replace(/\D/g, "") || budgetMax);
    router.push(`/ilanlar?${p.toString()}`);
  };

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

  /** Büyük sekmeler; seçili olmayanlar buzlu cam */
  const tabBtn = (active: boolean) =>
    active
      ? "rounded-xl bg-secondary px-6 py-3 font-headline text-sm font-bold uppercase tracking-[0.12em] text-white shadow-lg shadow-black/30 transition hover:brightness-105"
      : "rounded-xl border border-white/30 bg-white/15 px-6 py-3 font-headline text-sm font-bold uppercase tracking-[0.12em] text-white shadow-sm backdrop-blur-md transition hover:bg-white/25";

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-3 flex flex-wrap justify-center gap-2 px-1 sm:gap-3" role="tablist" aria-label="İlan türü">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={tabBtn(tab === t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className={shell}>
        <div className="grid grid-cols-1 items-stretch gap-3 p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <div className={fieldShell}>
            <DropdownField label="Neresi?" options={cities} value={city} onChange={setCity} isOverlay={isOverlay} />
          </div>
          <div className={fieldShell}>
            <DropdownField label="Tip" options={types} value={emlak} onChange={setEmlak} isOverlay={isOverlay} />
          </div>
          <div className={fieldShell}>
            <span
              className={
                isOverlay
                  ? "mb-1.5 block text-[11px] font-headline font-bold uppercase tracking-[0.08em] text-white/55"
                  : "mb-1.5 block text-[11px] font-headline font-bold uppercase tracking-[0.08em] text-on-surface/45"
              }
            >
              Bütçe (max)
            </span>
            <input
              className={textInputCls}
              placeholder="Örn. 1500000"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={onSearch}
            className="btn-tactile min-h-[58px] rounded-xl bg-secondary py-5 font-headline text-sm font-bold uppercase tracking-[0.12em] text-white shadow-lg shadow-secondary/25 transition hover:opacity-90 md:min-h-0 md:self-stretch md:px-8"
          >
            İLANLARI GÖR
          </button>
        </div>
      </div>
    </div>
  );
}
