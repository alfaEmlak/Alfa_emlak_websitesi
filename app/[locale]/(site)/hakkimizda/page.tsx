import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { getSiteSettingsOrFallback, getSocialLinks, hasVisibleSocialLinks } from "@/lib/site-settings";
import { SocialLinksBar } from "@/components/site/SocialLinksBar";

const CONTENT_KEYS = ["content01", "content02", "content03", "content04", "content05", "content06", "content07"] as const;
const FAQ_IDS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15"] as const;

export default async function AboutPage() {
  const t = await getTranslations("AboutPage");
  const tc = await getTranslations("Common");

  const rawSettings = await getSiteSettingsOrFallback();
  const social = getSocialLinks(rawSettings);
  const showSocial = hasVisibleSocialLinks(social);

  return (
    <main className="mx-auto max-w-[1440px] flex-1 bg-surface px-6 py-16 md:px-8 md:py-24">
      <nav className="font-headline text-xs uppercase tracking-widest text-on-surface/45">
        <Link href="/" className="hover:text-secondary">
          {tc("home")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-primary">{t("breadcrumb")}</span>
      </nav>
      <div className="mt-10 max-w-4xl">
        <span className="label-sm block text-secondary" style={{ fontSize: "11px", letterSpacing: "0.12em" }}>
          {t("corporateLabel")}
        </span>
        <h1 className="mt-4 font-headline text-4xl font-extrabold tracking-tight text-primary md:text-5xl">{t("title")}</h1>
        <div className="mt-10 space-y-6 text-base leading-relaxed text-on-surface/60">
          {CONTENT_KEYS.map((key) => (
            <p key={key} className="whitespace-pre-line">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {t(key as any)}
            </p>
          ))}
        </div>
        <Link
          href="/iletisim"
          className="btn-tactile mt-12 inline-block rounded-lg bg-secondary px-10 py-4 font-headline text-xs font-extrabold uppercase tracking-[0.2em] text-white shadow-lg shadow-secondary/20 transition hover:opacity-90"
        >
          {t("ctaButton")}
        </Link>

        <section id="sss" className="mt-20 scroll-mt-24 border-t border-primary/10 pt-16">
          <h2 className="font-headline text-2xl font-extrabold tracking-tight text-primary md:text-3xl">{t("faqTitle")}</h2>
          <div className="mt-10 space-y-3">
            {FAQ_IDS.map((id) => (
              <details
                key={id}
                className="group rounded-xl border border-primary/[0.08] bg-surface-lowest/70 px-5 py-4 shadow-[var(--shadow-ambient)] open:bg-white"
              >
                <summary className="cursor-pointer list-none font-headline text-sm font-bold text-primary [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start justify-between gap-3">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <span>{t(`faqQ${id}` as any)}</span>
                    <span className="shrink-0 text-secondary transition group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </span>
                </summary>
                <div className="mt-4 whitespace-pre-line border-t border-primary/5 pt-4 text-sm leading-relaxed text-on-surface/65">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {t(`faqA${id}` as any)}
                </div>
              </details>
            ))}
          </div>
        </section>

        {showSocial ? (
          <SocialLinksBar
            social={social}
            title={tc("socialTitle")}
            align="start"
            className="mt-20 border-t border-primary/10 pt-16"
          />
        ) : null}
      </div>
    </main>
  );
}
