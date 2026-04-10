import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-[1440px] flex-1 bg-surface px-6 py-16 md:px-8 md:py-24">
      <nav className="font-headline text-xs uppercase tracking-widest text-on-surface/45">
        <Link href="/" className="hover:text-secondary">
          Ana Sayfa
        </Link>
        <span className="mx-2">/</span>
        <span className="text-primary">Hakkımızda</span>
      </nav>
      <div className="mt-10 max-w-3xl">
      <span className="label-sm block text-secondary" style={{ fontSize: "11px", letterSpacing: "0.12em" }}>
        Kurumsal
      </span>
      <h1 className="mt-4 font-headline text-4xl font-extrabold tracking-tight text-primary md:text-5xl">Hakkımızda</h1>
      <div className="mt-10 space-y-6 text-base leading-relaxed text-on-surface/60">
        <p>
          <strong className="text-primary">ALFA EMLAK</strong>, Kuzey Kıbrıs’ta konut, arsa, ticari gayrimenkul ve projelerde seçkin
          portföy sunan kurumsal bir emlak rehberidir.
        </p>
        <p>
          Amacımız; şeffaf süreç, güçlü yerel bilgi ve görsel odaklı ilan deneyimi ile hem yatırımcıya hem konut alıcısına güven
          veren bir yol haritası çizmektir.
        </p>
        <p>Sanal tur, detaylı ilan sayfaları ve deneyimli danışman ağımızla yanınızdayız.</p>
      </div>
      <Link
        href="/iletisim"
        className="btn-tactile mt-12 inline-block rounded-lg bg-secondary px-10 py-4 font-headline text-xs font-extrabold uppercase tracking-[0.2em] text-white shadow-lg shadow-secondary/20 transition hover:opacity-90"
      >
        İletişime geçin
      </Link>
      </div>
    </main>
  );
}
