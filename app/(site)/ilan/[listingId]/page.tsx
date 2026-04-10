import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PropertyCard } from "@/components/site/PropertyCard";
import { getAdminSession } from "@/lib/admin-auth";
import { resolveConsultant } from "@/lib/consultant";
import {
  daysAgo,
  formatMoney,
  parseNearby,
  parseStringArray,
  primaryImageUrl,
  sortImages,
  visibleDetailRows,
} from "@/lib/listing-utils";
import { listingKindLabel } from "@/lib/listing-kinds";
import {
  getListingByPublicIdSafe,
  getSimilarListingsSafe,
} from "@/lib/listings-query";
import { getDefaultConsultant, getSiteSettingsOrFallback } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";
import { getNearbyPoiRowsForListing } from "@/lib/osm-nearby";
import { toVideoEmbedUrl } from "@/lib/video-embed";

type Props = { params: Promise<{ listingId: string }> };

export async function generateMetadata({ params }: Props) {
  try {
    const { listingId } = await params;
    const row = await prisma.listing.findFirst({ where: { listingId } });
    if (!row || row.publishStatus !== "PUBLISHED") {
      return { title: "İlan | ALFA EMLAK", robots: { index: false } };
    }
    return {
      title: `${row.title} | ALFA EMLAK`,
      description: row.shortDescription || row.title,
    };
  } catch {
    return { title: "İlan | ALFA EMLAK" };
  }
}

export default async function ListingDetailPage({ params }: Props) {
  const { listingId } = await params;
  const session = await getAdminSession();
  const isAdmin = !!session.isAdmin;
  const listing = await getListingByPublicIdSafe(listingId, isAdmin);
  if (!listing) notFound();

  if (listing.publishStatus === "PUBLISHED") {
    prisma.listing.update({ where: { id: listing.id }, data: { views: { increment: 1 } } }).catch(() => {});
  }

  const settings = await getSiteSettingsOrFallback();
  const consultant = resolveConsultant(listing, getDefaultConsultant(settings));
  const images = sortImages(listing);
  const main = images[0];
  const thumbs = images.slice(1, 5);
  const detailRows = visibleDetailRows(listing.detailFields);
  const features = parseStringArray(listing.features);
  const nearbyManual = parseNearby(listing.nearbyPlaces);
  const nearbyAuto = listing.nearbyEnabled ? await getNearbyPoiRowsForListing(listing) : [];
  const showNearbySection =
    listing.nearbyEnabled && (nearbyAuto.length > 0 || nearbyManual.length > 0);
  const similar = await getSimilarListingsSafe(listing.id, listing.city, listing.kind, 4);

  const locLine = [listing.neighborhood, listing.region, listing.city, "Kıbrıs"].filter(Boolean).join(", ");

  return (
    <main className="mx-auto max-w-[1440px] flex-1 bg-surface px-6 py-10 md:px-8 lg:py-14">
      {isAdmin && listing.publishStatus !== "PUBLISHED" ? (
        <div className="mb-4 rounded-lg bg-amber-100 px-4 py-2 text-sm text-amber-900">
          Yönetici önizlemesi — ilan {listing.publishStatus === "DRAFT" ? "taslak" : "gizli"}.
        </div>
      ) : null}

      <nav className="flex flex-wrap gap-1 font-headline text-xs uppercase tracking-wider text-on-surface/45">
        <Link href="/" className="hover:text-secondary">
          Ana Sayfa
        </Link>
        <span>/</span>
        <Link
          href={`/ilanlar?tur=${listing.kind === "SATILIK" ? "satilik" : listing.kind === "KIRALIK" ? "kiralik" : listing.kind === "GUNLUK_KIRALIK" ? "gunluk" : "proje"}`}
          className="hover:text-secondary"
        >
          {listingKindLabel(listing.kind)}
        </Link>
        <span>/</span>
        <span className="text-primary">{listing.city}</span>
        <span>/</span>
        {listing.region ? (
          <>
            <span className="text-primary">{listing.region}</span>
            <span>/</span>
          </>
        ) : null}
        <span className="font-semibold text-primary">{listing.title}</span>
        <span className="text-on-surface/30">/ {listing.listingId}</span>
      </nav>

      <div className="mt-8 grid gap-3 lg:grid-cols-12 lg:gap-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-3xl rounded-b-2xl bg-surface-low lg:col-span-7 lg:aspect-auto lg:min-h-[420px]">
          {main ? (
            <Image src={main.url} alt="" fill className="object-cover" sizes="(max-width:1024px) 100vw, 58vw" />
          ) : (
            <Image src={primaryImageUrl(listing)} alt="" fill className="object-cover" sizes="(max-width:1024px) 100vw, 58vw" />
          )}
          {listing.badgeVirtualTour && listing.virtualTourEnabled ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/25">
              <div className="flex flex-col items-center rounded-xl bg-black/50 px-6 py-4 text-white backdrop-blur-sm">
                <span className="text-3xl">▶</span>
                <span className="mt-1 text-sm font-semibold">360° Sanal Tur</span>
              </div>
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:col-span-5 lg:grid-cols-2 lg:grid-rows-2">
          {thumbs.map((img, i) => (
            <div
              key={img.id}
              className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-low ${i === 1 && listing.badgeVirtualTour ? "ring-2 ring-secondary" : ""}`}
            >
              <Image src={img.url} alt="" fill className="object-cover" sizes="(max-width:1024px) 50vw, 20vw" />
              {i === 1 && listing.badgeVirtualTour ? (
                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">360°</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <button type="button" className="text-sm font-semibold text-secondary hover:underline">
          Tüm fotoğrafları göster
        </button>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="flex flex-col gap-4 pb-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-headline text-2xl font-extrabold tracking-tight text-primary sm:text-3xl md:text-4xl">{listing.title}</h1>
              <p className="mt-2 text-on-surface/50">{locLine}</p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
              <p className="font-headline text-3xl font-extrabold text-secondary md:text-4xl">{formatMoney(listing.price, listing.currency)}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-surface-low px-3 py-1.5 text-sm font-medium text-primary ring-1 ring-primary/[0.12] transition hover:bg-surface-high"
                >
                  ♡ Favori
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-surface-low px-3 py-1.5 text-sm font-medium text-primary ring-1 ring-primary/[0.12] transition hover:bg-surface-high"
                >
                  Paylaş
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-6 text-sm text-on-surface/60">
            {listing.bedrooms != null ? (
              <div className="flex items-center gap-2">
                <span className="text-lg">🛏</span>
                <span>{listing.bedrooms} Yatak Odası</span>
              </div>
            ) : null}
            {listing.bathrooms != null ? (
              <div className="flex items-center gap-2">
                <span className="text-lg">🛁</span>
                <span>{listing.bathrooms} Banyo</span>
              </div>
            ) : null}
            {listing.areaM2 != null ? (
              <div className="flex items-center gap-2">
                <span className="text-lg">⬛</span>
                <span>{listing.areaM2} m²</span>
              </div>
            ) : null}
          </div>

          {detailRows.length ? (
            <div className="mt-10 rounded-2xl bg-surface-lowest p-6 shadow-[var(--shadow-ambient)] ring-1 ring-primary/[0.1]">
              <h2 className="font-headline text-lg font-bold text-primary">İlan bilgileri</h2>
              <dl className="mt-4 grid gap-x-8 gap-y-1 sm:grid-cols-2">
                {detailRows.map((r) => (
                  <div key={r.key} className="flex justify-between gap-4 rounded-lg py-2.5 text-sm">
                    <dt className="text-on-surface/50">{r.label}</dt>
                    <dd className="font-medium text-primary">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          <div className="mt-8 rounded-2xl bg-surface-lowest p-6 shadow-[var(--shadow-ambient)] ring-1 ring-primary/[0.1]">
            <h2 className="font-headline text-lg font-bold text-primary">İlan özeti</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {listing.statsShowViews ? (
                <div>
                  <p className="font-headline text-2xl font-bold text-primary">{listing.views.toLocaleString("tr-TR")}</p>
                  <p className="text-xs text-on-surface/50">görüntülenme</p>
                </div>
              ) : null}
              {listing.statsShowRating && listing.rating != null ? (
                <div>
                  <p className="font-headline text-2xl font-bold text-primary">{listing.rating}</p>
                  <p className="text-xs text-on-surface/50">puan</p>
                </div>
              ) : null}
              <div>
                <p className="font-headline text-2xl font-bold text-primary">{daysAgo(listing.createdAt)}</p>
                <p className="text-xs text-on-surface/50">gün önce eklendi</p>
              </div>
              <div>
                <p className="font-headline text-2xl font-bold text-primary">{daysAgo(listing.updatedAt)}</p>
                <p className="text-xs text-on-surface/50">gün önce güncellendi</p>
              </div>
            </div>
          </div>

          {listing.longDescription ? (
            <div className="mt-10">
              <h2 className="font-headline text-lg font-bold text-primary">
                {listing.propertyType} Açıklaması
              </h2>
              <div
                className="mt-4 max-w-none text-sm leading-relaxed text-on-surface/60 [&_p]:mt-3"
                dangerouslySetInnerHTML={{ __html: listing.longDescription }}
              />
            </div>
          ) : null}

          {features.length ? (
            <div className="mt-10 rounded-2xl bg-surface-low p-6 shadow-[var(--shadow-ambient)] ring-1 ring-primary/[0.08]">
              <h2 className="font-headline text-lg font-bold text-primary">Öne çıkan özellikler</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-on-surface/60">
                    <span className="text-secondary">•</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {listing.videoEnabled && listing.videoUrl ? (
            <section id="video" className="mt-12 scroll-mt-28">
              <h2 className="font-headline text-lg font-bold text-primary">Video</h2>
              {toVideoEmbedUrl(listing.videoUrl) ? (
                <div className="mt-4 aspect-video overflow-hidden rounded-2xl bg-surface-low">
                  <iframe
                    title="İlan videosu"
                    className="h-full w-full"
                    src={toVideoEmbedUrl(listing.videoUrl)!}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <a href={listing.videoUrl} className="mt-4 inline-block text-sm font-semibold text-secondary hover:underline" target="_blank" rel="noopener noreferrer">
                  Videoyu aç →
                </a>
              )}
            </section>
          ) : null}

          {listing.virtualTourEnabled && listing.virtualTourUrl ? (
            <section className="mt-12">
              <h2 className="font-headline text-lg font-bold text-primary">360° Sanal Tur</h2>
              <a
                href={listing.virtualTourUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative mt-4 block aspect-video overflow-hidden rounded-2xl bg-zinc-900"
              >
                <Image src={primaryImageUrl(listing)} alt="" fill className="object-cover opacity-70" sizes="100vw" unoptimized />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <span className="text-5xl">▶</span>
                  <span className="mt-2 font-semibold">Turunu Başlat</span>
                </div>
              </a>
            </section>
          ) : null}

          {listing.mapEnabled && listing.lat != null && listing.lng != null ? (
            <section className="mt-12">
              <h2 className="font-headline text-lg font-bold text-primary">Haritada Konumu</h2>
              <iframe
                title="Konum"
                className="mt-4 h-[420px] w-full rounded-2xl ring-1 ring-primary/[0.12]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${listing.lat},${listing.lng}&z=14&output=embed`}
              />
            </section>
          ) : null}

          {showNearbySection ? (
            <section className="mt-12">
              <h2 className="font-headline text-lg font-bold text-primary">Yakında Neler Var?</h2>
              {nearbyAuto.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {nearbyAuto.map((row) => (
                    <li
                      key={row.categoryId}
                      className="rounded-xl bg-surface-high px-4 py-3 text-sm shadow-[var(--shadow-ambient)] ring-1 ring-primary/[0.06]"
                    >
                      <p className="label-sm text-on-surface/45">{row.categoryLabel}</p>
                      <div className="mt-1 flex justify-between gap-3">
                        <span className="font-medium text-primary">{row.name}</span>
                        <span className="shrink-0 tabular-nums font-medium text-on-surface/50">{row.distanceLabel}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
              {nearbyManual.length > 0 ? (
                <>
                  {nearbyAuto.length > 0 ? (
                    <h3 className="mt-8 font-headline text-base font-bold text-primary">Ek bilgiler</h3>
                  ) : null}
                  <ul className={`space-y-2 ${nearbyAuto.length > 0 ? "mt-3" : "mt-4"}`}>
                    {nearbyManual.map((n) => (
                      <li
                        key={n.name + n.distance}
                        className="flex justify-between rounded-xl bg-surface-high px-4 py-3 text-sm shadow-[var(--shadow-ambient)]"
                      >
                        <span className="text-primary">{n.name}</span>
                        <span className="font-medium text-on-surface/50">{n.distance}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>
          ) : null}

          {similar.length ? (
            <section className="mt-14">
              <h2 className="font-headline text-xl font-bold text-primary">Benzer ilanlar</h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {similar.map((l) => (
                  <PropertyCard key={l.id} listing={l} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="lg:col-span-4">
          <div className="sticky top-[calc(var(--header-h)+1rem)] space-y-6">
            <div className="rounded-2xl bg-surface-lowest p-6 shadow-[var(--shadow-ambient)] ring-1 ring-primary/[0.12]">
              <div className="flex items-center gap-3">
                {consultant.logo ? (
                  <Image src={consultant.logo} alt="" width={48} height={48} className="h-12 w-12 rounded-lg object-cover" />
                ) : null}
                <div>
                  <p className="label-sm text-on-surface/45">{consultant.office}</p>
                  <p className="font-headline font-semibold text-primary">{consultant.name}</p>
                </div>
              </div>
              {consultant.photo ? (
                <div className="relative mx-auto mt-4 h-24 w-24 overflow-hidden rounded-full">
                  <Image src={consultant.photo} alt="" fill className="object-cover" />
                </div>
              ) : null}
              <div className="mt-6 space-y-2">
                {consultant.phone ? (
                  <a
                    href={`tel:${consultant.phone}`}
                    className="btn-tactile btn-primary-gradient block w-full rounded-xl py-3 text-center text-sm font-bold text-white"
                  >
                    Telefonla Bak
                  </a>
                ) : null}
                <Link
                  href="/iletisim"
                  className="block w-full rounded-xl bg-surface-high py-3 text-center text-sm font-semibold text-primary ring-1 ring-primary/[0.12] transition hover:bg-surface-highest"
                >
                  Mesaj Gönder
                </Link>
                {consultant.whatsapp ? (
                  <a
                    href={`https://wa.me/${consultant.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-lg border border-emerald-200 bg-emerald-50 py-3 text-center text-sm font-semibold text-emerald-800"
                  >
                    WhatsApp
                  </a>
                ) : null}
              </div>
              <div className="mt-4 space-y-1 pt-4 text-xs">
                <Link href={`/ilanlar?q=${encodeURIComponent(consultant.name)}`} className="block text-secondary hover:underline">
                  Danışmanın diğer ilanları
                </Link>
                <Link href="/ilanlar" className="block text-secondary hover:underline">
                  Ofisin tüm ilanları
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
