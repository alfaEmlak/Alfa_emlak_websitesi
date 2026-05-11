import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { getSiteSettingsOrFallback, getSocialLinks } from "@/lib/site-settings";
import { ContactForm } from "@/components/site/ContactForm";
import { getTranslatedSiteSettings } from "@/lib/i18n-utils";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SocialLinksBar } from "@/components/site/SocialLinksBar";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ listing?: string }>;
}

export default async function ContactPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const listingParam = typeof sp.listing === "string" ? sp.listing.trim() : "";

  let listingBanner: { listingId: string; title: string } | null = null;
  if (listingParam) {
    const { data } = await supabaseAdmin
      .from("listings")
      .select("listing_id, title")
      .eq("listing_id", listingParam)
      .eq("publish_status", "PUBLISHED")
      .maybeSingle();
    if (data?.listing_id && typeof data.title === "string" && data.title.trim()) {
      listingBanner = { listingId: data.listing_id, title: data.title.trim() };
    }
  }

  const rawSettings = await getSiteSettingsOrFallback();
  const s = getTranslatedSiteSettings(rawSettings, locale);
  const social = getSocialLinks(rawSettings);
  
  const t = await getTranslations("ContactPage");
  const tc = await getTranslations("Common");

  const defaultSubject =
    listingBanner != null
      ? t("listingSubjectDefault", { id: listingBanner.listingId, title: listingBanner.title })
      : undefined;
  const listingDetailHref =
    listingBanner != null ? `/${locale}/ilan/${encodeURIComponent(listingBanner.listingId)}` : null;

  return (
    <main className="mx-auto max-w-[1440px] flex-1 bg-surface px-6 py-16 md:px-8 md:py-24">
      <nav className="font-headline text-xs uppercase tracking-widest text-on-surface/45">
        <Link href="/" className="hover:text-secondary">
          {tc("home")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-primary">{t("breadcrumb")}</span>
      </nav>
      <div className="mt-10 grid gap-16 lg:grid-cols-2">
        <div>
          <span className="label-sm mb-4 block text-secondary" style={{ fontSize: "11px", letterSpacing: "0.12em" }}>
            {tc("contactUs")}
          </span>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary md:text-5xl">{t("title")}</h1>
          <p className="mt-6 text-lg leading-relaxed text-on-surface/50">
            {t("subtitle")}
          </p>
          <ul className="mt-12 space-y-4">
            <li className="flex items-start gap-4 rounded-2xl border border-primary/10 bg-white p-5 shadow-[var(--shadow-ambient)] transition hover:border-secondary/30">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"/>
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface/45">{tc("phone")}</p>
                <a className="mt-1 block text-base font-semibold text-primary hover:text-secondary" href="tel:+905338606535">
                  +90 533 860 65 35
                </a>
              </div>
            </li>
            <li className="flex items-start gap-4 rounded-2xl border border-primary/10 bg-white p-5 shadow-[var(--shadow-ambient)] transition hover:border-secondary/30">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface/45">{tc("address")}</p>
                <a
                  className="mt-1 inline-flex items-center gap-1.5 text-base font-semibold text-primary hover:text-secondary"
                  href="https://maps.app.goo.gl/wJ87hJw7pCxv2vHA6"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Alfa Emlak Ofisi
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M7 17 17 7"/>
                    <path d="M7 7h10v10"/>
                  </svg>
                </a>
                <p className="mt-1 text-xs text-on-surface/55">Google Haritalar&apos;da görüntüle</p>
              </div>
            </li>
            {s.whatsapp ? (
              <li className="flex items-start gap-4 rounded-2xl border border-primary/10 bg-white p-5 shadow-[var(--shadow-ambient)] transition hover:border-emerald-400/40">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M20.52 3.48A11.78 11.78 0 0 0 12.04 0C5.46 0 .09 5.37.09 11.96c0 2.11.55 4.17 1.6 5.99L0 24l6.21-1.63a11.92 11.92 0 0 0 5.83 1.49h.01c6.58 0 11.95-5.37 11.95-11.96 0-3.19-1.25-6.19-3.48-8.42zM12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.69.97.98-3.6-.23-.37a9.85 9.85 0 0 1-1.5-5.25c0-5.47 4.45-9.92 9.93-9.92 2.65 0 5.14 1.03 7.01 2.91a9.85 9.85 0 0 1 2.9 7.02c0 5.47-4.45 9.92-9.93 9.92zm5.45-7.43c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.5-1.78-1.67-2.08-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.09 3.19 5.06 4.47.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35z"/>
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface/45">{tc("whatsapp")}</p>
                  <a
                    className="mt-1 block text-base font-semibold text-emerald-700 hover:underline"
                    href={`https://wa.me/${s.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {s.whatsapp}
                  </a>
                </div>
              </li>
            ) : null}
            {s.email ? (
              <li className="flex items-start gap-4 rounded-2xl border border-primary/10 bg-white p-5 shadow-[var(--shadow-ambient)] transition hover:border-secondary/30">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-10 5L2 7"/>
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface/45">{tc("email")}</p>
                  <a className="mt-1 block text-base font-semibold text-primary hover:text-secondary" href={`mailto:${s.email}`}>
                    {s.email}
                  </a>
                </div>
              </li>
            ) : null}
          </ul>

          <div className="mt-8 overflow-hidden rounded-2xl border border-primary/10 shadow-[var(--shadow-ambient)]">
            <iframe
              src="https://maps.google.com/maps?q=Alfa%20Emlak%20K%C4%B1br%C4%B1s&t=&z=13&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="280"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Alfa Emlak ofis konumu"
            />
          </div>

          <SocialLinksBar
            social={social}
            title={tc("socialTitle")}
            align="start"
            className="mt-14 border-t border-(--ghost-outline)/60 pt-10"
          />
        </div>
        <ContactForm
          listingContext={listingBanner}
          listingDetailHref={listingDetailHref}
          defaultSubject={defaultSubject}
          labels={{
            formTitle: t("formTitle"),
            formSubtitle: t("formSubtitle"),
            namePlaceholder: t("namePlaceholder"),
            emailPlaceholder: t("emailPlaceholder"),
            phonePlaceholder: t("phonePlaceholder"),
            subjectPlaceholder: t("subjectPlaceholder"),
            messagePlaceholder: t("messagePlaceholder"),
            sendButton: t("sendButton"),
            successMessage: t("successMessage"),
            errorMessage: t("errorMessage"),
            validationNamePhone: t("validationNamePhone"),
            sending: tc("sending"),
            listingContextBadge: t("listingContextBadge"),
            viewListing: t("viewListing"),
          }}
        />
      </div>
    </main>
  );
}
