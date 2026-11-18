"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useEffect, useState } from "react";
import type { MenuTopItem } from "@/lib/default-menu";
import alfaLogo from "@/alfaemlaklogov1-removebg-preview.png";

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
      className={`shrink-0 text-primary/40 transition-transform duration-200 ${open ? "rotate-180 text-secondary" : ""}`}
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function Arrow() {
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
      className="shrink-0 text-primary/30"
      aria-hidden
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

const rowClass =
  "flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-headline text-[15px] font-bold text-primary transition active:bg-slate-50";

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
      <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative flex h-full w-[88vw] max-w-sm flex-col bg-white shadow-2xl animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3">
          <Link href="/" onClick={onClose} className="shrink-0">
            <Image src={alfaLogo} alt="Alfa Emlak" width={160} height={44} className="h-10 w-auto object-contain" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.close}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-primary transition hover:bg-slate-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <nav className="flex-1 overflow-y-auto overscroll-contain">
          <ul className="divide-y divide-slate-100">
            {menu.map((item) => {
              const isOpen = expanded === item.id;
              const label = labels.topLabels[item.id] ?? item.label;
              const topHref = TOP_HREF[item.id];
              const panelId = `mnav-${item.id}`;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={rowClass}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setExpanded(isOpen ? null : item.id)}
                  >
                    <span className={isOpen ? "text-secondary" : undefined}>{label}</span>
                    <Chevron open={isOpen} />
                  </button>

                  {isOpen ? (
                    <div id={panelId} className="space-y-4 bg-slate-50/70 px-5 pb-5 pt-1">
                      {topHref ? (
                        <Link
                          href={topHref}
                          onClick={onClose}
                          className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm font-bold text-secondary shadow-sm ring-1 ring-slate-100"
                        >
                          <span>
                            {label} · {labels.allListings}
                          </span>
                          <Arrow />
                        </Link>
                      ) : null}

                      {item.columns.map((col) => (
                        <div key={col.title}>
                          <p className="mb-2 font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface/45">
                            {col.title}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {col.links.map((l) => (
                              <Link
                                key={l.label + l.href}
                                href={l.href}
                                onClick={onClose}
                                className="rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-primary/80 ring-1 ring-slate-200 transition active:scale-95 active:bg-secondary active:text-white"
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
                <span>{labels.allListings}</span>
                <Arrow />
              </Link>
            </li>
            <li>
              <Link href="/hakkimizda" onClick={onClose} className={rowClass}>
                <span>{labels.aboutUs}</span>
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
                  <span>{labels.career}</span>
                  <Arrow />
                </button>
              </li>
            ) : null}
          </ul>
        </nav>

        {/* Sticky CTA */}
        <div className="shrink-0 border-t border-slate-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Link
            href="/iletisim"
            onClick={onClose}
            className="block rounded-xl bg-secondary px-4 py-3.5 text-center font-headline text-xs font-extrabold uppercase tracking-[0.16em] text-white shadow-lg shadow-secondary/25"
          >
            {labels.listProperty}
          </Link>
        </div>
      </div>
    </div>
  );
}
