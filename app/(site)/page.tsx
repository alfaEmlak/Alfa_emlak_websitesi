import Image from "next/image";
import Link from "next/link";
import { HeroSearch } from "@/components/site/HeroSearch";
import { PropertyCard } from "@/components/site/PropertyCard";
import { TcmbRatesStrip } from "@/components/site/TcmbRatesStrip";
import { getFeaturedListingsSafe } from "@/lib/listings-query";
import { getSiteSettingsOrFallback } from "@/lib/site-settings";
import { getTcmbDailyRates } from "@/lib/tcmb-rates";

const heroImage = "/pexels-tolgaaslanturk-10785667.jpg";

const whyMain =
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=900&q=80";
const whySide =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80";

export default async function HomePage() {
  const [settings, featured, tcmbRates] = await Promise.all([
    getSiteSettingsOrFallback(),
    getFeaturedListingsSafe(9),
    getTcmbDailyRates(),
  ]);
  const grid = featured.slice(0, 9);

  return (
    <main className="flex-1">
      <div className="relative h-[100dvh] min-h-[600px] w-full overflow-visible">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <Image
            src={heroImage}
            alt="Girne kıyı ve liman havadan görünümü"
            fill
            priority
            className="origin-bottom scale-[1.08] object-cover object-[50%_100%]"
            sizes="100vw"
          />
        </div>

        <section className="relative z-10 flex h-full min-h-0 flex-col px-6 pb-8 pt-28 md:px-12 md:pb-10 lg:px-16">
          <div className="mx-auto flex w-full min-h-0 max-w-[1440px] flex-1 flex-col justify-center">
            <div className="mx-auto flex w-full max-w-4xl flex-col items-center space-y-4 text-center md:max-w-5xl md:space-y-5">
              <div className="flex flex-col items-center gap-0">
                <div className="pointer-events-none flex w-full justify-center leading-none">
                  <Image
                    src="/alfaemlak3dlogo.png"
                    alt="Alfa Emlak"
                    width={689}
                    height={653}
                    sizes="(max-width: 768px) calc(100vw - 2rem), 18rem"
                    className="block h-auto w-[min(16rem,calc(100vw-2rem))] object-contain align-top drop-shadow-[0_12px_32px_rgba(0,0,0,0.4)] sm:w-[min(17rem,calc(100vw-2.5rem))] md:w-[min(18rem,calc(100vw-3rem))]"
                    priority
                  />
                </div>
                <h1 className="mt-1.5 text-white md:mt-2">
                  <span className="block font-headline text-5xl font-extrabold leading-[1.02] tracking-[-0.03em] md:text-7xl lg:text-8xl">
                    Kıbrıs&apos;ın En
                  </span>
                  <span className="mt-1 flex flex-col items-center gap-0 leading-[1.05] sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-3 md:mt-0.5">
                    <span className="font-prestijli-word hero-prestijli">Prestijli</span>
                    <span className="font-headline text-5xl font-extrabold tracking-[-0.03em] text-white sm:inline md:text-7xl lg:text-8xl">
                      portföyü
                    </span>
                  </span>
                </h1>
              </div>
              <span className="inline-block rounded-full border border-white/25 bg-white/10 px-4 py-1.5 font-headline text-[11px] tracking-[0.35em] text-white">
                ALFA EMLAK
              </span>
              <p className="max-w-2xl font-sans text-base leading-relaxed text-white/85 md:max-w-3xl md:text-lg md:leading-relaxed">
                {settings.heroSubtitle ||
                  "Alfa Emlak ile hayalinizdeki konutu, arsayı veya yatırımı keşfedin. Şeffaf süreç, güçlü portföy."}
              </p>
            </div>
          </div>
          <div className="mx-auto mt-8 w-full max-w-[1440px] shrink-0 md:mt-10">
            <HeroSearch variant="light" />
          </div>
        </section>
      </div>

      {tcmbRates ? <TcmbRatesStrip data={tcmbRates} /> : null}

      <section id="portfoy" className="relative overflow-hidden bg-surface px-6 py-20 md:px-8 md:py-28 lg:py-32">
        <div className="bg-text-faded absolute -left-20 top-16 font-headline text-[18vw] font-black leading-none opacity-40 tight-tracking md:text-[20vw]">
          ALFA
        </div>
        <div className="relative z-10 mx-auto max-w-[1440px]">
          <div className="mb-14 flex flex-col items-baseline justify-between gap-8 md:mb-20 md:flex-row">
            <div className="max-w-xl">
              <span className="label-sm mb-4 block text-secondary" style={{ fontSize: "11px", letterSpacing: "0.12em" }}>
                Koleksiyon
              </span>
              <h2 className="font-headline text-4xl font-extrabold leading-none tracking-tight text-primary md:text-5xl lg:text-6xl">
                Öne çıkan gayrimenkuller
              </h2>
            </div>
            <Link
              href="/ilanlar"
              className="group flex items-center gap-2 font-headline text-sm font-bold tracking-wider text-primary underline decoration-primary/25 decoration-2 underline-offset-4 transition hover:decoration-secondary"
            >
              Tümünü incele
              <span aria-hidden className="text-base leading-none transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
            {grid.length === 0 ? (
              <p className="col-span-full text-center text-on-surface/50">Yakında yeni ilanlar eklenecek.</p>
            ) : (
              grid.map((l, i) => <PropertyCard key={l.id} listing={l} stagger={i % 3 === 1} />)
            )}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-primary px-6 py-20 text-white md:px-8 md:py-28 lg:py-32">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-14 md:grid-cols-2 md:gap-20">
          <div>
            <span className="label-sm mb-6 block text-secondary" style={{ fontSize: "11px", letterSpacing: "0.12em" }}>
              Analiz
            </span>
            <h2 className="mb-8 font-headline text-4xl font-extrabold tracking-tight md:text-5xl">
              Piyasa verileriyle geleceğe yatırım yapın
            </h2>
            <p className="mb-12 text-lg leading-relaxed text-white/60">
              Kıbrıs gayrimenkul piyasasında doğru lokasyon ve zamanlama kritik. Uzman ekibimizle portföyünüzü birlikte şekillendiriyoruz.
            </p>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="mb-2 font-headline text-4xl font-extrabold text-secondary">+%18</div>
                <div className="font-headline text-[10px] font-bold uppercase tracking-widest text-white/40">Yıllık trend*</div>
              </div>
              <div>
                <div className="mb-2 font-headline text-4xl font-extrabold text-white">12+</div>
                <div className="font-headline text-[10px] font-bold uppercase tracking-widest text-white/40">Yıl deneyim</div>
              </div>
            </div>
            <p className="mt-4 text-[10px] text-white/30">*Örnek gösterim, yatırım tavsiyesi değildir.</p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-secondary/20 blur-[100px]" />
            <div className="relative rounded-2xl bg-white/[0.07] p-8 shadow-[var(--shadow-float)] ring-1 ring-white/10 backdrop-blur-md">
              <div className="mb-8 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest opacity-50">Değer artış grafiği</span>
                <span className="rounded bg-secondary px-2 py-1 font-headline text-[9px] font-bold text-white">ÖRNEK</span>
              </div>
              <div className="flex h-48 items-end gap-2">
                {[20, 35, 30, 55, 45, 75, 90].map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 cursor-pointer rounded-t-sm transition-all hover:bg-secondary ${i === 6 ? "bg-secondary shadow-[0_0_20px_rgba(253,152,39,0.4)]" : "bg-white/10"}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="mt-4 flex justify-between font-headline text-[10px] font-bold opacity-30">
                <span>2018</span>
                <span>2024</span>
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
                  Farkımız
                </span>
                <h2 className="mb-8 font-headline text-4xl font-extrabold tracking-tight text-primary md:text-5xl">Neden Alfa Emlak?</h2>
              </div>
              <div className="space-y-10">
                <div className="group flex gap-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-lowest font-headline font-bold text-primary shadow-[var(--shadow-ambient)] transition-all group-hover:bg-primary group-hover:text-white">
                    01
                  </div>
                  <div>
                    <h4 className="mb-2 font-headline text-lg font-extrabold text-primary">Derin saha bilgisi</h4>
                    <p className="text-sm leading-relaxed text-on-surface/50">
                      Kıbrıs genelinde lokasyon seçimi ve fiyat analizi ile doğru mülkü hedefliyoruz.
                    </p>
                  </div>
                </div>
                <div className="group flex gap-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-lowest font-headline font-bold text-primary shadow-[var(--shadow-ambient)] transition-all group-hover:bg-primary group-hover:text-white">
                    02
                  </div>
                  <div>
                    <h4 className="mb-2 font-headline text-lg font-extrabold text-primary">Şeffaf süreç</h4>
                    <p className="text-sm leading-relaxed text-on-surface/50">
                      Sanal tur, detaylı ilan sayfaları ve danışman desteği ile güven veren deneyim.
                    </p>
                  </div>
                </div>
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
              Gayrimenkulünüzü
              <br />
              doğru alıcılarla buluşturun
            </h2>
            <p className="mb-12 text-lg font-light text-white/50">
              Portföyünüzü değerlendirmek ve listelemek için ALFA EMLAK ekibiyle iletişime geçin.
            </p>
            <Link
              href="/iletisim"
              className="btn-tactile inline-block rounded-lg bg-white px-10 py-5 font-headline text-xs font-extrabold uppercase tracking-[0.3em] text-primary transition-all hover:bg-secondary hover:text-white"
            >
              Ücretsiz ekspertiz
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
