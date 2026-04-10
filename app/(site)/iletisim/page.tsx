import Link from "next/link";
import { getSiteSettingsOrFallback } from "@/lib/site-settings";

export default async function ContactPage() {
  const s = await getSiteSettingsOrFallback();

  return (
    <main className="mx-auto max-w-[1440px] flex-1 bg-surface px-6 py-16 md:px-8 md:py-24">
      <nav className="font-headline text-xs uppercase tracking-widest text-on-surface/45">
        <Link href="/" className="hover:text-secondary">
          Ana Sayfa
        </Link>
        <span className="mx-2">/</span>
        <span className="text-primary">İletişim</span>
      </nav>
      <div className="mt-10 grid gap-16 lg:grid-cols-2">
        <div>
          <span className="label-sm mb-4 block text-secondary" style={{ fontSize: "11px", letterSpacing: "0.12em" }}>
            Bize ulaşın
          </span>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary md:text-5xl">İletişim</h1>
          <p className="mt-6 text-lg leading-relaxed text-on-surface/50">
            Portföy, değerleme veya danışmanlık için doğrudan ofis hatlarımızdan bize ulaşabilirsiniz.
          </p>
          <ul className="mt-12 space-y-6">
            {s.phone ? (
              <li className="flex gap-4">
                <span className="material-symbols-outlined text-primary">call</span>
                <div>
                  <p className="label-sm text-on-surface/45">Telefon</p>
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
                  <p className="label-sm text-on-surface/45">WhatsApp</p>
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
                  <p className="label-sm text-on-surface/45">E-posta</p>
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
                  <p className="label-sm text-on-surface/45">Adres</p>
                  <p className="whitespace-pre-line text-on-surface/60 leading-relaxed">{s.address}</p>
                </div>
              </li>
            ) : null}
          </ul>
        </div>
        <div className="rounded-2xl bg-surface-lowest p-10 shadow-[var(--shadow-ambient)] ring-1 ring-primary/[0.12]">
          <p className="font-headline text-lg font-bold text-primary">Mesaj</p>
          <p className="mt-3 text-sm leading-relaxed text-on-surface/50">
            İlan vermek veya ön görüşme için telefon ve WhatsApp üzerinden en hızlı yanıtı alırsınız.
          </p>
          <Link
            href="/ilanlar"
            className="btn-tactile mt-8 inline-block rounded-lg bg-secondary px-8 py-4 font-headline text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-secondary/20 transition hover:opacity-90"
          >
            Portföyü incele
          </Link>
        </div>
      </div>
    </main>
  );
}
