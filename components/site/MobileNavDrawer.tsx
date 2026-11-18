"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useEffect, useState } from "react";
import type { MenuTopItem } from "@/lib/default-menu";

export type MobileNavLabels = {
  menu: string;
  close: string;
  allListings: string;
  aboutUs: string;
  career: string;
  listProperty: string;
  /** Translated label per top-level menu id (falls back to item.label). */
  topLabels: Partial<Record<string, string>>;
};

/** Where the top-level row's "see all" link points to. */
const TOP_HREF: Record<string, string> = {
  satilik: "/ilanlar?tur=satilik",
  projeler: "/ilanlar?tur=proje",
  kiralik: "/ilanlar?tur=kiralik",
  gunluk: "/ilanlar?tur=gunluk",
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform duration-300 ${open ? "rotate-180 text-secondary" : "text-white/40"}`}
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function Arrow({ className = "text-white/35" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

const rowClass =
  "group flex w-full items-center justify-between gap-3 px-6 py-4 text-left font-headline text-[15px] font-bold text-white/90 transition hover:text-white active:bg-white/5";

export function MobileNavDrawer({
  open,
  onClose,
  menu,
  labels,
  onCareer,
}: {
  open: boolean;
  onClose: () => void;
  menu: MenuTopItem[];
  labels: MobileNavLabels;
  onCareer?: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Lock page scroll + close on Escape while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex justify-end md:hidden" role="dialog" aria-modal="true" aria-label={labels.menu}>
      <div className="absolute inset-0 bg-[#020a24]/60 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative flex h-full w-[88vw] max-w-sm flex-col overflow-hidden bg-gradient-to-br from-[#0c2a6e] via-[#041546] to-[#020a24] text-white shadow-2xl animate-in slide-in-from-right">
        {/* Decorative glows + watermark logo */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-secondary/25 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-[#1d4ed8]/25 blur-3xl" aria-hidden />
        <Image
          src="/logo-kontur-beyaz.png"
          alt=""
          width={472}
          height={412}
          aria-hidden
          className="pointer-events-none absolute -bottom-10 -right-16 w-80 max-w-none rotate-[-8deg] select-none opacity-[0.09]"
        />

        {/* Header */}
        <div className="relative shrink-0 px-6 pb-5 pt-5">
          <div className="flex items-start justify-between">
            <Link href="/" onClick={onClose} className="flex items-center gap-3">
              <Image
                src="/alfa-3d-logo.png"
                alt="Alfa Emlak"
                width={968}
                height={1200}
                sizes="64px"
                className="h-[72px] w-auto drop-shadow-[0_8px_24px_rgba(253,152,39,0.35)]"
              />
              <span className="space-y-0.5 border-l border-white/15 pl-3 font-headline text-[10px] font-bold uppercase leading-snug tracking-[0.22em]">
                <span className="block text-white/80">Emlak</span>
                <span className="block text-white/80">Yatırım</span>
                <span className="block text-secondary">Danışmanlık</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              aria-label={labels.close}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-white/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="mt-5 h-px bg-gradient-to-r from-secondary/70 via-white/15 to-transparent" aria-hidden />
        </div>

        {/* Scrollable body */}
        <nav className="relative flex-1 overflow-y-auto overscroll-contain">
          <ul className="divide-y divide-white/[0.07]">
            {menu.map((item) => {
              const isOpen = expanded === item.id;
              const label = labels.topLabels[item.id] ?? item.label;
              const topHref = TOP_HREF[item.id];
              const panelId = `mnav-${item.id}`;
              return (
                <li key={item.id} className={isOpen ? "bg-white/[0.04]" : undefined}>
                  <button
                    type="button"
                    className={rowClass}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setExpanded(isOpen ? null : item.id)}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`h-5 w-1 rounded-full transition ${isOpen ? "bg-secondary" : "bg-white/15 group-hover:bg-white/30"}`}
                        aria-hidden
                      />
                      <span className={isOpen ? "text-secondary" : undefined}>{label}</span>
                    </span>
                    <Chevron open={isOpen} />
                  </button>

                  {isOpen ? (
                    <div id={panelId} className="space-y-4 px-6 pb-6 pt-1">
                      {topHref ? (
                        <Link
                          href={topHref}
                          onClick={onClose}
                          className="flex items-center justify-between rounded-xl bg-gradient-to-r from-secondary/25 to-secondary/5 px-4 py-3 text-sm font-bold text-secondary ring-1 ring-secondary/30"
                        >
                          <span>
                            {label} · {labels.allListings}
                          </span>
                          <Arrow className="text-secondary" />
                        </Link>
                      ) : null}

                      {item.columns.map((col) => (
                        <div key={col.title}>
                          <p className="mb-2 font-headline text-[10px] font-bold uppercase tracking-widest text-white/45">
                            {col.title}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {col.links.map((l) => (
                              <Link
                                key={l.label + l.href}
                                href={l.href}
                                onClick={onClose}
                                className="rounded-full bg-white/[0.08] px-3 py-1.5 text-[13px] font-semibold text-white/85 ring-1 ring-white/10 transition hover:bg-white/15 active:scale-95 active:bg-secondary active:text-primary"
                              >
                                {l.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}

            <li>
              <Link href="/ilanlar" onClick={onClose} className={rowClass}>
                <span className="pl-4">{labels.allListings}</span>
                <Arrow />
              </Link>
            </li>
            <li>
              <Link href="/hakkimizda" onClick={onClose} className={rowClass}>
                <span className="pl-4">{labels.aboutUs}</span>
                <Arrow />
              </Link>
            </li>
            {onCareer ? (
              <li>
                <button
                  type="button"
                  className={rowClass}
                  onClick={() => {
                    onClose();
                    onCareer();
                  }}
                >
                  <span className="pl-4">{labels.career}</span>
                  <Arrow />
                </button>
              </li>
            ) : null}
          </ul>
        </nav>

        {/* Sticky CTA */}
        <div className="relative shrink-0 border-t border-white/10 bg-[#020a24]/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
          <Link
            href="/iletisim"
            onClick={onClose}
            className="block rounded-xl bg-gradient-to-r from-secondary to-[#ffb65c] px-4 py-3.5 text-center font-headline text-xs font-extrabold uppercase tracking-[0.16em] text-primary shadow-lg shadow-secondary/30 transition active:scale-[0.98]"
          >
            {labels.listProperty}
          </Link>
        </div>
      </div>
    </div>
  );
}
