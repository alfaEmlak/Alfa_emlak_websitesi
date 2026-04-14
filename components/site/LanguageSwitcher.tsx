"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

/* ── Inline SVG flags (4×3 ratio, 20×15 viewport) ── */

function FlagTR({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="20" height="15" rx="1.5" fill="#E30A17" />
      <circle cx="8.5" cy="7.5" r="3.5" fill="white" />
      <circle cx="9.3" cy="7.5" r="2.8" fill="#E30A17" />
      <polygon points="11.5,7.5 10,8.5 10.4,6.8 9.2,5.9 10.9,5.9" fill="white" />
    </svg>
  );
}

function FlagGB({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="20" height="15" rx="1.5" fill="#012169" />
      <path d="M0,0 L20,15 M20,0 L0,15" stroke="white" strokeWidth="2.5" />
      <path d="M0,0 L20,15 M20,0 L0,15" stroke="#C8102E" strokeWidth="1" />
      <path d="M10,0 V15 M0,7.5 H20" stroke="white" strokeWidth="4" />
      <path d="M10,0 V15 M0,7.5 H20" stroke="#C8102E" strokeWidth="2" />
    </svg>
  );
}

function FlagRU({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="20" height="15" rx="1.5" fill="#D52B1E" />
      <rect width="20" height="5" fill="white" />
      <rect y="5" width="20" height="5" fill="#0039A6" />
    </svg>
  );
}

function FlagDE({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="20" height="15" rx="1.5" fill="#FFCE00" />
      <rect width="20" height="5" fill="#000" />
      <rect y="5" width="20" height="5" fill="#DD0000" />
    </svg>
  );
}

function FlagIR({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="20" height="15" rx="1.5" fill="white" />
      <rect width="20" height="5" fill="#239F40" />
      <rect y="10" width="20" height="5" fill="#DA0000" />
    </svg>
  );
}

const languages = [
  { code: "tr", label: "Türkçe", Flag: FlagTR },
  { code: "en", label: "English", Flag: FlagGB },
  { code: "ru", label: "Русский", Flag: FlagRU },
  { code: "de", label: "Deutsch", Flag: FlagDE },
  { code: "fa", label: "فارسی", Flag: FlagIR },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = languages.find((l) => l.code === locale) ?? languages[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function switchLocale(code: string) {
    const segments = pathname.split("/");
    segments[1] = code;
    router.push(segments.join("/"));
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs font-medium text-primary/80 transition hover:bg-primary/10 hover:text-primary"
        aria-label="Dil seçimi"
      >
        <current.Flag className="h-[14px] w-[19px] shrink-0 rounded-[2px] shadow-[0_0_0_0.5px_rgba(0,0,0,.1)]" />
        <span className="hidden sm:inline">{current.label}</span>
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.22 7.22a.75.75 0 0 1 1.06 0L10 10.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.28a.75.75 0 0 1 0-1.06z" clipRule="evenodd"/></svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => switchLocale(lang.code)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 ${
                lang.code === locale
                  ? "bg-primary/[0.04] font-semibold text-primary"
                  : "text-primary/70"
              }`}
            >
              <lang.Flag className="h-[14px] w-[19px] shrink-0 rounded-[2px] shadow-[0_0_0_0.5px_rgba(0,0,0,.12)]" />
              <span>{lang.label}</span>
              {lang.code === locale && (
                <svg className="ml-auto h-4 w-4 text-secondary" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.58l7.3-7.3a1 1 0 0 1 1.4 0z" clipRule="evenodd"/></svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
