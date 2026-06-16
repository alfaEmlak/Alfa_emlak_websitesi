import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { getTranslatedListing, getTranslatedSiteSettings } from "@/lib/i18n-utils";
import { getAnalysisSettings, getSiteSettingsOrFallback, getSliderSettings } from "@/lib/site-settings";
import { getFeaturedListingsSafe } from "@/lib/listings-query";
import { getSundovizRates } from "@/lib/sundoviz-rates";
import { HeroSearch } from "@/components/site/HeroSearch";
import { HeroSlider } from "@/components/site/HeroSlider";
import { PropertyCard } from "@/components/site/PropertyCard";
import { Link } from "@/i18n/routing";
import { SundovizRatesStrip } from "@/components/site/SundovizRatesStrip";
import { HomeBlogSection } from "@/components/site/HomeBlogSection";
import { getRecentPublishedBlogPosts } from "@/lib/blog-public";

const heroImage = "/pexels-tolgaaslanturk-10785667.jpg";

const whyMain = "/alfa-anahtar.png";
const whySide =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("HomePage");
  const tBlog = await getTranslations("BlogPage");

  const [settingsRaw, featuredRaw, sundovizRates, blogPosts] = await Promise.all([
    getSiteSettingsOrFallback(),
    getFeaturedListingsSafe(9),
    getSundovizRates(),
    getRecentPublishedBlogPosts(6),
  ]);

  const settings = getTranslatedSiteSettings(settingsRaw, locale);
  const sliderSettings = getSliderSettings(settingsRaw);
  const analysis = getAnalysisSettings(settingsRaw);
  const grid = featuredRaw.slice(0, 9).map(l => getTranslatedListing(l, locale));

  return (
    <main className="flex-1">
      <div className="relative w-full overflow-visible min-h-[100dvh] md:h-[100dvh] md:min-h-[600px]">
        <div className="absolute inset-0 z-0 overflow-hidden bg-black">
          <HeroSlider
            images={sliderSettings.images.length > 0 ? sliderSettings.images : [heroImage]}
            interval={sliderSettings.interval}
          />
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>

        <section className="relative z-10 flex h-full min-h-0 flex-col px-6 pb-8 pt-28 md:px-12 md:pb-10 lg:pl-24 lg:pr-32">
          <div className="mx-auto flex w-full min-h-0 max-w-[1440px] flex-1 flex-col justify-center">
            <div className="mt-5 flex w-full flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12 xl:gap-16">
              <div className="pointer-events-none flex shrink-0 justify-center lg:justify-start">
                <Image
                  src="/alfaemlak3dlogo.png"
                  alt="Alfa Emlak"
                  width={689}
                  height={653}
                  sizes="(max-width: 1024px) 280px, 450px"
                  className="h-auto w-full max-w-[280px] object-contain drop-shadow-[0_14px_38px_rgba(0,0,0,0.45)] sm:max-w-[320px] md:max-w-[380px] lg:max-w-[450px] xl:max-w-[500px]"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
              <div className="w-full max-w-3xl space-y-7 text-center lg:ml-auto lg:w-auto lg:max-w-4xl lg:text-right">
                <span className="inline-block rounded-full border border-white/25 bg-white/10 px-4 py-1.5 font-headline text-[11px] tracking-[0.35em] text-white">
                  ALFA EMLAK
                </span>
                <h1 className="text-white">
                  <span className="block font-headline text-4xl font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-5xl md:text-7xl lg:text-8xl">
                    {t("heroTitle")}
                  </span>
                  <span className="mt-2 flex flex-col items-center gap-0 leading-[1.05] sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-center sm:gap-x-3 md:mt-1 lg:justify-end">
                    <span className="font-prestijli-word hero-prestijli">{t("heroPrestijli")}</span>
                    <span className="font-headline text-4xl font-extrabold tracking-[-0.03em] text-white sm:inline sm:text-5xl md:text-7xl lg:text-8xl">
                      {t("heroPortfolio")}
                    </span>
                  </span>
                </h1>
                <p className="mx-auto max-w-lg font-sans text-base leading-relaxed text-white/85 md:max-w-xl md:text-lg md:leading-relaxed lg:ml-auto lg:mr-0">
                  {settings.heroSubtitle || settings.heroTitle || t("heroSubtitle")}
                </p>
              </div>
            </div>
          </div>
          <div className="mx-auto mt-8 w-full max-w-[1440px] shrink-0 md:mt-10">
            <HeroSearch variant="light" />
          </div>
        </section>
      </div>

      {sundovizRates ? <SundovizRatesStrip initialData={sundovizRates} /> : null}

      <section id="portfoy" className="relative overflow-hidden bg-surface px-6 py-20 md:px-8 md:py-28 lg:py-32">
        <div className="relative z-0 mx-auto max-w-[1440px]">
          <div className="bg-text-faded absolute -left-10 top-0 max-w-full break-words font-headline text-[18vw] font-black leading-none opacity-40 tight-tracking md:-left-20 md:-top-10 md:text-[20vw] xl:text-[300px]">
            ALFA
          </div>
        </div>
        <div className="relative z-10 mx-auto max-w-[1440px]">
          <div className="mb-14 flex flex-col items-baseline justify-between gap-8 md:mb-20 md:flex-row">
            <div className="max-w-xl">
              <span className="label-sm mb-4 block text-secondary" style={{ fontSize: "11px", letterSpacing: "0.12em" }}>
                {t("featuredLabel")}
              </span>
              <h2 className="font-headline text-4xl font-extrabold leading-none tracking-tight text-primary md:text-5xl lg:text-6xl">
                {t("featuredTitle")}
              </h2>
            </div>
            <Link
              href="/ilanlar"
              className="group flex items-center gap-2 font-headline text-sm font-bold tracking-wider text-primary underline decoration-primary/25 decoration-2 underline-offset-4 transition hover:text-secondary hover:decoration-secondary"
            >
              {t("viewAll")}
              <span aria-hidden className="text-base leading-none transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
            {grid.length === 0 ? (
              <p className="col-span-full text-center text-on-surface/50">{t("noFeatured")}</p>
            ) : (
              grid.map((l, i) => <PropertyCard key={l.id} listing={l} stagger={i % 3 === 1} />)
            )}
          </div>
        </div>
      </section>

      <HomeBlogSection
        posts={blogPosts}
        locale={locale}
        label={t("blogLabel")}
        title={t("blogTitle")}
        viewAll={t("blogViewAll")}
        readMore={tBlog("readMore")}
      />

      <section className="relative overflow-hidden bg-primary px-6 py-20 text-white md:px-8 md:py-28 lg:py-32">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-14 md:grid-cols-2 md:gap-20">
          <div>
            <span className="label-sm mb-6 block text-secondary" style={{ fontSize: "11px", letterSpacing: "0.12em" }}>
              {analysis.label || t("analysisLabel")}
            </span>
            <h2 className="mb-8 font-headline text-4xl font-extrabold tracking-tight md:text-5xl">
              {analysis.title || t("analysisTitle")}
            </h2>
            <p className="mb-12 text-lg leading-relaxed text-white/60">
              {analysis.description || t("analysisDesc")}
            </p>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="mb-2 font-headline text-4xl font-extrabold text-secondary">{analysis.stat1Value || "+%18"}</div>
                <div className="font-headline text-[10px] font-bold uppercase tracking-widest text-white/40">{analysis.stat1Label || t("yearlyTrend")}</div>
              </div>
              <div>
                <div className="mb-2 font-headline text-4xl font-extrabold text-white">{analysis.stat2Value || "12+"}</div>
                <div className="font-headline text-[10px] font-bold uppercase tracking-widest text-white/40">{analysis.stat2Label || t("yearsExperience")}</div>
              </div>
            </div>
            <p className="mt-4 text-[10px] text-white/30">{analysis.disclaimer || t("disclaimer")}</p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-secondary/20 blur-[100px]" />
            <div className="relative rounded-2xl bg-white/[0.07] p-8 shadow-[var(--shadow-float)] ring-1 ring-white/10 backdrop-blur-md">
              <div className="mb-8 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest opacity-50">{analysis.chartTitle || t("chartTitle")}</span>
                <span className="rounded bg-secondary px-2 py-1 font-headline text-[9px] font-bold text-white">{analysis.exampleBadge || t("exampleBadge")}</span>
              </div>
              <div className="flex h-48 items-end gap-2">
                {analysis.bars.map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 cursor-pointer rounded-t-sm transition-all hover:bg-secondary ${i === analysis.bars.length - 1 ? "bg-secondary shadow-[0_0_20px_rgba(253,152,39,0.4)]" : "bg-white/10"}`}
                    style={{ height: `${Math.min(h, 100)}%` }}
                  />
                ))}
              </div>
              <div className="mt-4 flex justify-between font-headline text-[10px] font-bold opacity-30">
                <span>{analysis.startYear || "2018"}</span>
                <span>{analysis.endYear || "2024"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface-low px-6 py-20 md:px-8 md:py-36">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid grid-cols-1 items-center gap-16 md:grid-cols-12">
            <div className="grid grid-cols-12 gap-6 md:col-span-7">
              <div className="relative col-span-8 aspect-[4/5] overflow-hidden rounded-t-3xl rounded-b-lg shadow-[var(--shadow-ambient)]">
                <Image src={whyMain} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
              </div>
              <div className="relative col-span-4 mt-12 aspect-[3/4] overflow-hidden rounded-t-3xl rounded-b-lg shadow-[var(--shadow-float)] md:mt-20">
                <Image src={whySide} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 25vw" />
              </div>
            </div>
            <div className="space-y-12 md:col-span-5">
              <div>
                <span className="label-sm mb-4 block text-secondary" style={{ fontSize: "11px", letterSpacing: "0.12em" }}>
                  {t("whyUsLabel")}
                </span>
                <h2 className="mb-6 font-headline text-4xl font-extrabold tracking-tight text-primary md:text-5xl">{t("whyUsTitle")}</h2>
                <p className="text-sm leading-relaxed text-on-surface/55 whitespace-pre-line">{t("whyUsIntro")}</p>
              </div>
              <div className="space-y-10">
                {(["01", "02", "03", "04", "05", "06"] as const).map((id) => (
                  <div key={id} className="group flex gap-6">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-lowest font-headline font-bold text-primary shadow-[var(--shadow-ambient)] transition-all group-hover:bg-primary group-hover:text-white">
                      {id}
                    </div>
                    <div className="min-w-0">
                      <h4 className="mb-2 font-headline text-lg font-extrabold text-primary">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {t(`whyUs${id}Title` as any)}
                      </h4>
                      <p className="text-sm leading-relaxed text-on-surface/50 whitespace-pre-line">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {t(`whyUs${id}Desc` as any)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-primary/10 bg-surface-lowest/70 p-6 shadow-[var(--shadow-ambient)]">
                <h3 className="mb-3 font-headline text-lg font-extrabold text-primary">{t("whyUsResultTitle")}</h3>
                <p className="text-sm leading-relaxed text-on-surface/55 whitespace-pre-line">{t("whyUsConclusion")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20 md:px-8 md:pb-28">
        <div className="relative mx-auto max-w-[1440px] overflow-hidden rounded-2xl bg-primary px-8 py-20 shadow-[var(--shadow-float)] md:py-28 md:px-12">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute right-0 top-0 h-96 w-96 bg-white blur-[150px]" />
            <div className="absolute bottom-0 left-0 h-96 w-96 bg-secondary blur-[150px]" />
          </div>
          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <h2 className="mb-8 font-headline text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              {t("ctaTitle")}
            </h2>
            <p className="mb-12 text-lg font-light text-white/50">
              {t("ctaDesc")}
            </p>
            <Link
              href="/iletisim"
              className="btn-tactile inline-block rounded-lg bg-white px-10 py-5 font-headline text-xs font-extrabold uppercase tracking-[0.3em] text-primary transition-all hover:bg-secondary hover:text-white"
            >
              {t("ctaButton")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
