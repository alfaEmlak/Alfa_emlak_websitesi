import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";

export default async function AboutPage() {
  const t = await getTranslations("AboutPage");
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
      <div className="mt-10 max-w-3xl">
      <span className="label-sm block text-secondary" style={{ fontSize: "11px", letterSpacing: "0.12em" }}>
        {t("corporateLabel")}
      </span>
      <h1 className="mt-4 font-headline text-4xl font-extrabold tracking-tight text-primary md:text-5xl">{t("title")}</h1>
      <div className="mt-10 space-y-6 text-base leading-relaxed text-on-surface/60">
        <p>
          {t("content01")}
        </p>
        <p>
          {t("content02")}
        </p>
        <p>{t("content03")}</p>
      </div>
      <Link
        href="/iletisim"
        className="btn-tactile mt-12 inline-block rounded-lg bg-secondary px-10 py-4 font-headline text-xs font-extrabold uppercase tracking-[0.2em] text-white shadow-lg shadow-secondary/20 transition hover:opacity-90"
      >
        {t("ctaButton")}
      </Link>
      </div>
    </main>
  );
}
