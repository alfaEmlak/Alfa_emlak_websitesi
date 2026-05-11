"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import footerLogo from "@/alfaemlaklogov1-removebg-preview.png";
import type { SocialLinks } from "@/lib/site-settings";

type FooterSettings = {
  siteName?: string | null;
  address?: string | null;
  phone?: string | null;
};

function normalizeUrl(raw?: string | null): string {
  const t = (raw || "").trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

type ColLink = { label: string; href: string; external?: boolean };

function FooterColumn({ title, links }: { title: string; links: ColLink[] }) {
  return (
    <div>
      <h3 className="mb-3 font-headline text-sm font-bold uppercase tracking-wider text-primary">
        {title}
      </h3>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            {link.external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-600 transition-colors hover:text-secondary"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-sm text-slate-600 transition-colors hover:text-secondary"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter({ settings, social }: { settings: FooterSettings; social: SocialLinks }) {
  const t = useTranslations("Common");
  const year = new Date().getFullYear();

  const followLinks: ColLink[] = [
    social.facebook && { label: "Facebook", href: normalizeUrl(social.facebook), external: true },
    social.instagram && { label: "Instagram", href: normalizeUrl(social.instagram), external: true },
    social.youtube && { label: "YouTube", href: normalizeUrl(social.youtube), external: true },
    social.linkedin && { label: "LinkedIn", href: normalizeUrl(social.linkedin), external: true },
    social.x && { label: "X (Twitter)", href: normalizeUrl(social.x), external: true },
  ].filter(Boolean) as ColLink[];

  return (
    <footer className="mt-auto w-full border-t border-slate-100 bg-white">
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 sm:py-12 md:px-8">
        {/* Üst: sütunlar */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-5">
          <FooterColumn
            title="Kurumsal"
            links={[
              { label: t("aboutUs"), href: "/hakkimizda" },
              { label: "Blog", href: "/blog" },
              { label: t("contact"), href: "/iletisim" },
              { label: "Kariyer", href: "/iletisim" },
              { label: "Basın", href: "/iletisim" },
            ]}
          />
          <FooterColumn
            title="İlanlar"
            links={[
              { label: "Satılık", href: "/ilanlar?tur=satilik" },
              { label: "Kiralık", href: "/ilanlar?tur=kiralik" },
              { label: "Projeler", href: "/ilanlar?tur=proje" },
              { label: "Günlük Kiralık", href: "/ilanlar?tur=gunluk" },
              { label: "Tüm İlanlar", href: "/ilanlar" },
            ]}
          />
          <FooterColumn
            title="Hizmetlerimiz"
            links={[
              { label: "Danışmanlarımız", href: "/danismanlar" },
              { label: "AI Satış Asistanı", href: "/" },
              { label: "Değerleme Talebi", href: "/iletisim" },
              { label: "Vitrin İlanlar", href: "/ilanlar" },
              { label: "Yatırım Danışmanlığı", href: "/iletisim" },
            ]}
          />
          <FooterColumn
            title="Gizlilik ve Kullanım"
            links={[
              { label: t("privacy"), href: "/gizlilik" },
              { label: "KVKK Aydınlatma Metni", href: "/kvkk" },
              { label: "Sıkça Sorulan Sorular", href: "/hakkimizda#sss" },
              { label: "Kullanım Koşulları", href: "/gizlilik" },
              { label: "Sözleşmeler", href: "/iletisim" },
            ]}
          />
          <FooterColumn
            title="Bizi Takip Edin"
            links={
              followLinks.length > 0
                ? followLinks
                : [
                    { label: "Facebook", href: "#", external: true },
                    { label: "Instagram", href: "#", external: true },
                    { label: "YouTube", href: "#", external: true },
                  ]
            }
          />
        </div>

        {/* Orta: logo + iletişim */}
        <div className="mt-10 grid gap-6 border-t border-slate-100 pt-8 md:grid-cols-3 md:items-center">
          <div className="flex justify-center md:justify-start">
            <Image
              src={footerLogo}
              alt={settings.siteName || "Alfa Emlak"}
              placeholder="blur"
              className="h-10 w-auto max-w-[200px] object-contain"
              sizes="200px"
            />
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center text-sm text-slate-600">
            {settings.phone ? (
              <a
                className="font-headline text-base font-bold text-primary hover:text-secondary"
                href={`tel:${settings.phone.replace(/\s/g, "")}`}
              >
                {settings.phone}
              </a>
            ) : null}
            {settings.address ? (
              <p className="whitespace-pre-line leading-relaxed text-xs text-slate-500">{settings.address}</p>
            ) : null}
          </div>
          <p className="text-center font-headline text-[10px] uppercase tracking-widest text-slate-500 md:text-right">
            © {year} {settings.siteName || "Alfa Emlak"}. {t("allRightsReserved")}.
          </p>
        </div>
      </div>

      {/* Alt: Emy Studios */}
      <div className="border-t border-slate-100/80 bg-slate-50/60">
        <div className="mx-auto flex max-w-[1440px] items-center justify-center px-4 py-4 sm:px-6 md:px-8">
          <a
            href="https://emysoft.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Emy Software Studios"
            className="group flex items-center gap-3 rounded-full px-4 py-2 transition-all hover:bg-[#3a1a5c]/5"
          >
            <span className="font-headline text-[10px] uppercase tracking-widest text-slate-500 group-hover:text-[#3a1a5c]">
              Tasarım &amp; yazılım
            </span>
            <span className="flex items-baseline gap-1.5 leading-none">
              <span
                className="text-2xl font-bold italic text-[#3a1a5c] sm:text-[26px]"
                style={{ fontFamily: '"Brush Script MT","Lucida Handwriting","Segoe Script",cursive' }}
              >
                Emy
              </span>
              <span className="flex flex-col text-[10px] font-semibold uppercase leading-[1.1] tracking-wider text-[#3a1a5c]">
                <span>Software</span>
                <span>Studios</span>
              </span>
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}
