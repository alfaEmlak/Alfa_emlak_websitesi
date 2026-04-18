"use client";

import Image from "next/image";
import { Link, usePathname } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import type { MenuTopItem } from "@/lib/default-menu";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { useTranslations } from "next-intl";

type ActiveNav = "satilik" | "proje" | "kiralik" | "hakkimizda" | "ilanlar" | null;

function computeActive(pathname: string, tur: string | null): ActiveNav {
  // next-intl usePathname returns path WITHOUT locale prefix
  if (pathname === "/hakkimizda") return "hakkimizda";
  if (pathname === "/ilanlar" || pathname.startsWith("/ilan/")) {
    if (!tur) return "ilanlar";
    if (tur === "proje") return "proje";
    if (tur === "kiralik" || tur === "gunluk") return "kiralik";
    if (tur === "satilik") return "satilik";
    return "ilanlar";
  }
  if (pathname === "/") return null;
  return null;
}

function navItemClass(active: boolean) {
  return `font-headline text-sm font-bold uppercase tracking-[0.1em] transition-colors duration-300 ${
    active
      ? "border-b-2 border-secondary pb-1 text-secondary"
      : "border-b-2 border-transparent pb-1 text-primary/70 hover:text-secondary"
  }`;
}

function MegaPanel({
  item,
  onMouseEnter,
  onMouseLeave,
}: {
  item: MenuTopItem;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <div
      className="fixed left-1/2 top-[var(--header-h)] z-[300] w-[min(100vw-2rem,920px)] -translate-x-1/2 pt-4"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0px_20px_40px_rgba(4,21,70,0.08)]">
        <div
          className="grid gap-8"
          style={{ gridTemplateColumns: `repeat(${Math.min(item.columns.length, 5)}, minmax(0,1fr))` }}
        >
          {item.columns.map((col) => (
            <div key={col.title}>
              <p className="mb-3 font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface/45">{col.title}</p>
              <ul className="space-y-2 text-sm">
                {col.links.map((l) => (
                  <li key={l.label + l.href}>
                    <Link className="block py-1 text-primary transition hover:text-secondary" href={l.href}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SiteHeaderInner({ menu, siteName }: { menu: MenuTopItem[]; siteName: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("Common");
  const th = useTranslations("HomePage");
  
  const tur = searchParams.get("tur");
  const active = computeActive(pathname, tur);
  const [open, setOpen] = useState(false);
  const [desktopOpenId, setDesktopOpenId] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHome = pathname === "/";

  const satilik = menu.find((m) => m.id === "satilik");
  const projeler = menu.find((m) => m.id === "projeler");
  const kiralik = menu.find((m) => m.id === "kiralik");
  const dahaFazla = menu.find((m) => m.id === "daha-fazla");
  const desktopActiveMega = menu.find((m) => m.id === desktopOpenId) ?? null;
  const cancelDesktopClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  const scheduleDesktopClose = () => {
    cancelDesktopClose();
    closeTimerRef.current = setTimeout(() => setDesktopOpenId(null), 180);
  };

  return (
    <>
      <header
        className="fixed left-0 right-0 top-0 z-[200] border-b border-slate-100 bg-white shadow-sm"
        aria-label={`${siteName} — ${t("home")}`}
      >
        <nav className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-6 py-4 md:px-8 md:py-5">
          <Link href="/" className="shrink-0">
            <Image
              src="/alfaemlaklogo.png"
              alt={siteName || "Alfa Emlak"}
              width={200}
              height={48}
              className="h-9 w-auto max-w-[200px] object-contain md:h-10"
              priority
            />
          </Link>

          <div className="hidden flex-1 justify-center md:flex" onMouseEnter={cancelDesktopClose} onMouseLeave={scheduleDesktopClose}>
            <div className="relative">
              <div className="flex items-center gap-10 lg:gap-12">
              {satilik ? (
                <div className="relative" onMouseEnter={() => {
                  cancelDesktopClose();
                  setDesktopOpenId("satilik");
                }}>
                  <Link href="/ilanlar?tur=satilik" className={navItemClass(active === "satilik")}>
                    {t("forSale")}
                  </Link>
                </div>
              ) : null}
              {projeler ? (
                <div className="relative" onMouseEnter={() => {
                  cancelDesktopClose();
                  setDesktopOpenId("projeler");
                }}>
                  <Link href="/ilanlar?tur=proje" className={navItemClass(active === "proje")}>
                    {t("project")}
                  </Link>
                </div>
              ) : null}
              {kiralik ? (
                <div className="relative" onMouseEnter={() => {
                  cancelDesktopClose();
                  setDesktopOpenId("kiralik");
                }}>
                  <Link href="/ilanlar?tur=kiralik" className={navItemClass(active === "kiralik")}>
                    {t("forRent")}
                  </Link>
                </div>
              ) : null}
              {dahaFazla ? (
                <div className="relative" onMouseEnter={() => {
                  cancelDesktopClose();
                  setDesktopOpenId("daha-fazla");
                }}>
                  <button type="button" className={`${navItemClass(false)} cursor-default bg-transparent`}>
                    {t("more")}
                  </button>
                </div>
              ) : null}
              <Link href="/ilanlar" className={navItemClass(active === "ilanlar")} onMouseEnter={() => {
                cancelDesktopClose();
                setDesktopOpenId(null);
              }}>
                {t("allListings")}
              </Link>
              <Link href="/hakkimizda" className={navItemClass(active === "hakkimizda")} onMouseEnter={() => {
                cancelDesktopClose();
                setDesktopOpenId(null);
              }}>
                {t("aboutUs")}
              </Link>
              </div>
              {desktopActiveMega ? (
                <MegaPanel item={desktopActiveMega} onMouseEnter={cancelDesktopClose} onMouseLeave={scheduleDesktopClose} />
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/iletisim"
              className="btn-tactile hidden rounded-lg bg-secondary px-6 py-3 font-headline text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-secondary/20 transition-all duration-300 hover:opacity-80 active:scale-95 sm:px-8 md:inline-flex"
            >
              {t("listProperty")}
            </Link>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/15 bg-white/95 text-primary shadow-[0_8px_20px_rgba(4,21,70,0.12)] transition hover:border-primary/30 hover:bg-white md:hidden"
              aria-expanded={open}
              aria-label={t("menu")}
              onClick={() => setOpen(true)}
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
          </div>
        </nav>

        {open ? (
          <div className="fixed inset-0 z-[300] flex justify-end md:hidden">
            <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm transition-opacity" onClick={() => setOpen(false)} aria-hidden />
            <div className="relative flex h-full w-[85vw] max-w-sm flex-col overflow-y-auto bg-white shadow-2xl animate-in slide-in-from-right">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <span className="font-headline text-lg font-extrabold text-primary">{t("menu")}</span>
                <button type="button" onClick={() => setOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-primary transition hover:bg-slate-200">
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
              <div className="flex-1 p-5">
                <ul className="space-y-3 text-sm font-semibold">
              <li>
                <Link
                  href="/ilanlar?tur=satilik"
                  className="flex items-center justify-between rounded-xl border border-transparent px-3 py-3 text-primary transition hover:border-slate-200 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  <span>{t("forSale")}</span>
                  <span className="material-symbols-outlined text-base text-primary/35">chevron_right</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/ilanlar?tur=proje"
                  className="flex items-center justify-between rounded-xl border border-transparent px-3 py-3 text-primary transition hover:border-slate-200 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  <span>{t("project")}</span>
                  <span className="material-symbols-outlined text-base text-primary/35">chevron_right</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/ilanlar?tur=kiralik"
                  className="flex items-center justify-between rounded-xl border border-transparent px-3 py-3 text-primary transition hover:border-slate-200 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  <span>{t("forRent")}</span>
                  <span className="material-symbols-outlined text-base text-primary/35">chevron_right</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/ilanlar"
                  className="flex items-center justify-between rounded-xl border border-transparent px-3 py-3 text-primary transition hover:border-slate-200 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  <span>{t("allListings")}</span>
                  <span className="material-symbols-outlined text-base text-primary/35">chevron_right</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/hakkimizda"
                  className="flex items-center justify-between rounded-xl border border-transparent px-3 py-3 text-primary transition hover:border-slate-200 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  <span>{t("aboutUs")}</span>
                  <span className="material-symbols-outlined text-base text-primary/35">chevron_right</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/iletisim"
                  className="mt-1 block rounded-xl bg-secondary px-4 py-3 text-center font-headline text-xs font-extrabold uppercase tracking-[0.16em] text-white shadow-lg shadow-secondary/25"
                  onClick={() => setOpen(false)}
                >
                  {t("listProperty")}
                </Link>
              </li>
              {menu.map((item) => (
                <li key={item.id}>
                  <p className="px-1 pt-4 pb-2 font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface/45">{item.label}</p>
                  <ul className="space-y-1 rounded-xl border border-slate-100 bg-slate-50/45 p-2">
                    {item.columns.flatMap((c) =>
                      c.links.map((l) => (
                        <li key={l.href}>
                          <Link
                            href={l.href}
                            className="block rounded-lg px-2 py-2 text-primary/80 transition hover:bg-white hover:text-primary"
                            onClick={() => setOpen(false)}
                          >
                            {l.label}
                          </Link>
                        </li>
                      )),
                    )}
                  </ul>
                </li>
              ))}
              </ul>
              </div>
            </div>
          </div>
        ) : null}
      </header>
      {!isHome ? <div className="h-[var(--header-offset)] shrink-0" aria-hidden /> : null}
    </>
  );
}

function SiteHeaderFallback({ menu, siteName }: { menu: MenuTopItem[]; siteName: string }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [open, setOpen] = useState(false);
  const [desktopOpenId, setDesktopOpenId] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const satilik = menu.find((m) => m.id === "satilik");
  const projeler = menu.find((m) => m.id === "projeler");
  const kiralik = menu.find((m) => m.id === "kiralik");
  const dahaFazla = menu.find((m) => m.id === "daha-fazla");
  const desktopActiveMega = menu.find((m) => m.id === desktopOpenId) ?? null;
  const cancelDesktopClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  const scheduleDesktopClose = () => {
    cancelDesktopClose();
    closeTimerRef.current = setTimeout(() => setDesktopOpenId(null), 180);
  };

  return (
    <>
      <header
        className="fixed left-0 right-0 top-0 z-[200] border-b border-slate-100 bg-white shadow-sm"
        aria-label={`${siteName} — Navigasyon`}
      >
        <nav className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-6 py-4 md:px-8 md:py-5">
          <Link href="/" className="shrink-0">
            <Image
              src="/alfaemlaklogo.png"
              alt={siteName || "Alfa Emlak"}
              width={200}
              height={48}
              className="h-9 w-auto max-w-[200px] object-contain md:h-10"
              priority
            />
          </Link>
          <div className="hidden flex-1 justify-center md:flex" onMouseEnter={cancelDesktopClose} onMouseLeave={scheduleDesktopClose}>
            <div className="relative">
              <div className="flex items-center gap-10 lg:gap-12">
              {satilik ? (
                <div className="relative" onMouseEnter={() => {
                  cancelDesktopClose();
                  setDesktopOpenId("satilik");
                }}>
                  <Link href="/ilanlar?tur=satilik" className={navItemClass(false)}>
                    Satılık
                  </Link>
                </div>
              ) : null}
              {projeler ? (
                <div className="relative" onMouseEnter={() => {
                  cancelDesktopClose();
                  setDesktopOpenId("projeler");
                }}>
                  <Link href="/ilanlar?tur=proje" className={navItemClass(false)}>
                    Projeler
                  </Link>
                </div>
              ) : null}
              {kiralik ? (
                <div className="relative" onMouseEnter={() => {
                  cancelDesktopClose();
                  setDesktopOpenId("kiralik");
                }}>
                  <Link href="/ilanlar?tur=kiralik" className={navItemClass(false)}>
                    Kiralık
                  </Link>
                </div>
              ) : null}
              {dahaFazla ? (
                <div className="relative" onMouseEnter={() => {
                  cancelDesktopClose();
                  setDesktopOpenId("daha-fazla");
                }}>
                  <button type="button" className={`${navItemClass(false)} cursor-default bg-transparent`}>
                    Daha fazla
                  </button>
                </div>
              ) : null}
              <Link href="/ilanlar" className={navItemClass(false)} onMouseEnter={() => {
                cancelDesktopClose();
                setDesktopOpenId(null);
              }}>
                Tüm İlanlar
              </Link>
              <Link href="/hakkimizda" className={navItemClass(false)} onMouseEnter={() => {
                cancelDesktopClose();
                setDesktopOpenId(null);
              }}>
                Hakkımızda
              </Link>
              </div>
              {desktopActiveMega ? (
                <MegaPanel item={desktopActiveMega} onMouseEnter={cancelDesktopClose} onMouseLeave={scheduleDesktopClose} />
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/iletisim"
              className="btn-tactile hidden rounded-lg bg-secondary px-6 py-3 font-headline text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-secondary/20 transition-all duration-300 hover:opacity-80 active:scale-95 sm:px-8 md:inline-flex"
            >
              İlan Ver
            </Link>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/15 bg-white/95 text-primary shadow-[0_8px_20px_rgba(4,21,70,0.12)] transition hover:border-primary/30 hover:bg-white md:hidden"
              aria-expanded={open}
              aria-label="Menü"
              onClick={() => setOpen(true)}
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
          </div>
        </nav>
        {open ? (
          <div className="fixed inset-0 z-[300] flex justify-end md:hidden">
            <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm transition-opacity" onClick={() => setOpen(false)} aria-hidden />
            <div className="relative flex h-full w-[85vw] max-w-sm flex-col overflow-y-auto bg-white shadow-2xl animate-in slide-in-from-right">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <span className="font-headline text-lg font-extrabold text-primary">Menü</span>
                <button type="button" onClick={() => setOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-primary transition hover:bg-slate-200">
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
              <div className="flex-1 p-5">
                <ul className="space-y-3 text-sm font-semibold">
              <li>
                <Link
                  href="/ilanlar?tur=satilik"
                  className="flex items-center justify-between rounded-xl border border-transparent px-3 py-3 text-primary transition hover:border-slate-200 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  <span>Satılık</span>
                  <span className="material-symbols-outlined text-base text-primary/35">chevron_right</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/ilanlar?tur=proje"
                  className="flex items-center justify-between rounded-xl border border-transparent px-3 py-3 text-primary transition hover:border-slate-200 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  <span>Projeler</span>
                  <span className="material-symbols-outlined text-base text-primary/35">chevron_right</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/ilanlar?tur=kiralik"
                  className="flex items-center justify-between rounded-xl border border-transparent px-3 py-3 text-primary transition hover:border-slate-200 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  <span>Kiralık</span>
                  <span className="material-symbols-outlined text-base text-primary/35">chevron_right</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/ilanlar"
                  className="flex items-center justify-between rounded-xl border border-transparent px-3 py-3 text-primary transition hover:border-slate-200 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  <span>Tüm İlanlar</span>
                  <span className="material-symbols-outlined text-base text-primary/35">chevron_right</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/hakkimizda"
                  className="flex items-center justify-between rounded-xl border border-transparent px-3 py-3 text-primary transition hover:border-slate-200 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  <span>Hakkımızda</span>
                  <span className="material-symbols-outlined text-base text-primary/35">chevron_right</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/iletisim"
                  className="mt-1 block rounded-xl bg-secondary px-4 py-3 text-center font-headline text-xs font-extrabold uppercase tracking-[0.16em] text-white shadow-lg shadow-secondary/25"
                  onClick={() => setOpen(false)}
                >
                  İlan Ver
                </Link>
              </li>
              </ul>
              </div>
            </div>
          </div>
        ) : null}
      </header>
      {!isHome ? <div className="h-[var(--header-offset)] shrink-0" aria-hidden /> : null}
    </>
  );
}

export function SiteHeader({ menu, siteName }: { menu: MenuTopItem[]; siteName: string }) {
  return (
    <Suspense fallback={<SiteHeaderFallback menu={menu} siteName={siteName} />}>
      <SiteHeaderInner menu={menu} siteName={siteName} />
    </Suspense>
  );
}
