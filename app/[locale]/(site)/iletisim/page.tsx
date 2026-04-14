import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { getSiteSettingsOrFallback } from "@/lib/site-settings";
import { ContactForm } from "@/components/site/ContactForm";
import { getTranslatedSiteSettings } from "@/lib/i18n-utils";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  const rawSettings = await getSiteSettingsOrFallback();
  const s = getTranslatedSiteSettings(rawSettings, locale);
  
  const t = await getTranslations("ContactPage");
  const tc = await getTranslations("Common");

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
          <ul className="mt-12 space-y-6">
            {s.phone ? (
              <li className="flex gap-4">
                <span className="material-symbols-outlined text-primary">call</span>
                <div>
                  <p className="label-sm text-on-surface/45">{tc("phone")}</p>
                  <a className="text-primary hover:text-secondary" href={`tel:${s.phone.replace(/\s/g, "")}`}>
                    {s.phone}
                  </a>
                </div>
              </li>
            ) : null}
            {s.whatsapp ? (
              <li className="flex gap-4">
                <span className="material-symbols-outlined text-primary">chat</span>
                <div>
                  <p className="label-sm text-on-surface/45">{tc("whatsapp")}</p>
                  <a
                    className="text-emerald-700 hover:underline"
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
              <li className="flex gap-4">
                <span className="material-symbols-outlined text-primary">mail</span>
                <div>
                  <p className="label-sm text-on-surface/45">{tc("email")}</p>
                  <a className="text-primary hover:text-secondary" href={`mailto:${s.email}`}>
                    {s.email}
                  </a>
                </div>
              </li>
            ) : null}
            {s.address ? (
              <li className="flex gap-4">
                <span className="material-symbols-outlined text-primary">location_on</span>
                <div>
                  <p className="label-sm text-on-surface/45">{tc("address")}</p>
                  <p className="whitespace-pre-line text-on-surface/60 leading-relaxed">{s.address}</p>
                </div>
              </li>
            ) : null}
          </ul>
        </div>
        <ContactForm
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
            sending: tc("sending"),
          }}
        />
      </div>
    </main>
  );
}
