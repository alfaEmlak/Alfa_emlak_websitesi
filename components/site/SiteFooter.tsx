"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import type { SiteSettings } from "@prisma/client";
import { useTranslations } from "next-intl";
import footerLogo from "@/alfaemlaklogov1-removebg-preview.png";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const t = useTranslations("Common");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto w-full border-t border-slate-100 bg-white py-8 sm:py-10 md:py-12">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-6 px-4 sm:px-6 md:flex-row md:gap-6 md:px-8">
        <div className="mb-1 md:mb-0">
          <Image
            src={footerLogo}
            alt={settings.siteName || "Alfa Emlak"}
            placeholder="blur"
            className="h-8 w-auto max-w-[200px] object-contain object-left sm:h-10"
            sizes="200px"
          />
        </div>
        <nav className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8">
          <Link
            href="/iletisim"
            className="font-headline text-[10px] uppercase tracking-widest text-slate-500 underline-offset-4 transition-all hover:text-secondary hover:underline hover:decoration-secondary"
          >
            {t("privacy")}
          </Link>
          <Link
            href="/hakkimizda"
            className="font-headline text-[10px] uppercase tracking-widest text-slate-500 underline-offset-4 transition-all hover:text-secondary hover:underline hover:decoration-secondary"
          >
            {t("aboutUs")}
          </Link>
          <Link
            href="/iletisim"
            className="font-headline text-[10px] uppercase tracking-widest text-slate-500 underline-offset-4 transition-all hover:text-secondary hover:underline hover:decoration-secondary"
          >
            {t("contact")}
          </Link>
        </nav>
        <p className="font-headline text-center text-[10px] uppercase tracking-widest text-primary/60 md:text-left">
          © {year} {settings.siteName}. {t("allRightsReserved")}.
        </p>
      </div>
      {settings.address || settings.phone ? (
        <div className="mx-auto mt-6 max-w-[1440px] border-t border-slate-100/80 px-4 pt-6 text-center sm:mt-8 sm:px-6 sm:pt-8 md:px-8 md:text-left">
          <div className="flex flex-col gap-3 text-sm text-on-surface/50 md:flex-row md:flex-wrap md:justify-center md:gap-8">
            {settings.address ? <p className="whitespace-pre-line leading-relaxed">{settings.address}</p> : null}
            {settings.phone ? (
              <a className="inline-flex min-h-[44px] items-center justify-center hover:text-secondary" href={`tel:${settings.phone.replace(/\s/g, "")}`}>
                {settings.phone}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </footer>
  );
}
