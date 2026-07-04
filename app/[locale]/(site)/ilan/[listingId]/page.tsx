import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getTranslatedListing, getTranslatedSiteSettings } from "@/lib/i18n-utils";
import { listingPropertyTypeDisplayLabel } from "@/lib/listing-property-taxonomy";
import { displayListingCity, displayListingRegionOrNeighborhood } from "@/lib/listing-city";
import { landPriceIsPerDonumFromDetailFields, listingPropertyTypeIsArsa, parseLandFieldsFromDetailFields } from "@/lib/land-parcel-detail";
import { listingPropertyTypeIsTicari } from "@/lib/commercial-parcel-detail";
import { stripOwnerContactPrivateFromDetailFields } from "@/lib/owner-contact-private";
import { getListingDetailForLocale } from "@/lib/listing-detail-data";
import { getAdminSession } from "@/lib/admin-auth";
import { getSimilarListingsSafe, getListingsByConsultantSafe, incrementListingViewsSupabase, unpublishedListingAccessFromSession } from "@/lib/listings-query";
import { getSiteSettingsOrFallback, getDefaultConsultant } from "@/lib/site-settings";
import { resolveConsultant } from "@/lib/consultant";
import { sortImages, visibleDetailRows, parseNearby, primaryImageUrl, daysAgo, mergeListingHighlightLines } from "@/lib/listing-utils";
import { normalizeFloorFromListing } from "@/lib/floor-field";
import { getNearbyPoiRowsForListing } from "@/lib/osm-nearby";
import { toVideoEmbedUrl } from "@/lib/video-embed";
import { PhotoGallery } from "@/components/site/PhotoGallery";
import { PropertyCard } from "@/components/site/PropertyCard";
import { ConsultantPhoneCta } from "@/components/site/ConsultantPhoneCta";
import { ListingShareButton } from "@/components/site/ListingShareButton";
import { ListingPriceWithFx } from "@/components/site/ListingPriceWithFx";

type Props = { params: Promise<{ listingId: string; locale: string }> };

export async function generateMetadata({ params }: Props) {
  try {
    const { listingId, locale } = await params;
    const session = await getAdminSession();
    const access = unpublishedListingAccessFromSession(session);
    const enriched = await getListingDetailForLocale(listingId, locale, access);
    if (!enriched) {
      return { title: "İlan | ALFA EMLAK", robots: { index: false } };
    }
    const tr = getTranslatedListing(enriched, locale);
    const base = {
      title: `${tr.title} | ALFA EMLAK`,
      description: tr.shortDescription || tr.title,
    };
    if (enriched.publishStatus !== "PUBLISHED") {
      return { ...base, robots: { index: false } };
    }
    return base;
  } catch {
    return { title: "İlan | ALFA EMLAK" };
  }
}

export default async function ListingDetailPage({ params }: Props) {
  const { listingId, locale } = await params;
  const t = await getTranslations("ListingDetail");
  const tc = await getTranslations("Common");
  const tw = await getTranslations("Wizard");

  const session = await getAdminSession();
  const access = unpublishedListingAccessFromSession(session);
  const listingEnriched = await getListingDetailForLocale(listingId, locale, access);
  if (!listingEnriched) notFound();

  const listingTranslated = getTranslatedListing(listingEnriched, locale);
  const listing = {
    ...listingTranslated,
    detailFields: stripOwnerContactPrivateFromDetailFields(listingTranslated.detailFields),
  };

  if (listing.publishStatus === "PUBLISHED") {
    void incrementListingViewsSupabase(listing.id);
  }

  const settingsRaw = await getSiteSettingsOrFallback();
  const settings = getTranslatedSiteSettings(settingsRaw, locale);
  const consultant = resolveConsultant(listing, getDefaultConsultant(settings));
  const consultantAgentId = (listing as any).createdByAgentId ?? (listing as any).created_by_agent_id ?? null;
  const consultantListingsHref = consultantAgentId
    ? `/danismanlar/${consultantAgentId}`
    : consultant.name
      ? `/ilanlar?danismanAdi=${encodeURIComponent(consultant.name)}`
      : "/ilanlar";
  const images = sortImages(listing);
  const detailRows = visibleDetailRows(listing.detailFields);

  const buildingAgeDisplay = (() => {
    let preset: string | null = null;
    try {
      const o = typeof listing.detailFields === "string" ? JSON.parse(listing.detailFields) : null;
      const p = (o as { buildingAgePreset?: unknown } | null)?.buildingAgePreset;
      if (p === "project" || p === "zero") preset = p as string;
    } catch { /* ignore */ }
    if (preset === "project") return "Proje";
    const ba = (listing as any).buildingAge ?? (listing as any).building_age;
    if (ba == null || String(ba).trim() === "") return null;
    const n = Number(ba);
    if (!Number.isFinite(n)) return null;
    return n === 0 ? "Sıfır" : String(n);
  })();

  const structuredRows: { key: string; label: string; value: string }[] = [];
  const pushRow = (key: string, label: string, value: unknown) => {
    if (value == null || String(value).trim() === "") return;
    structuredRows.push({ key, label, value: String(value) });
  };

  const propertyTypeRaw = listing.propertyType ?? (listing as any).property_type;
  const isKonutListing = !listingPropertyTypeIsArsa(propertyTypeRaw) && !listingPropertyTypeIsTicari(propertyTypeRaw);
  const propertyTypeLabel = listingPropertyTypeDisplayLabel(String(propertyTypeRaw ?? ""));
  pushRow("propertyType", tw("labels.propertyType"), propertyTypeLabel);
  pushRow("kind", tw("labels.listingType"), tc(`listingKinds.${listing.kind}`));

  const isRentalListing = listing.kind === "KIRALIK" || listing.kind === "GUNLUK_KIRALIK";
  const bedroomsVal = (listing as any).bedrooms ?? (listing as any).bed_rooms;
  pushRow("bedrooms", isRentalListing ? tw("propertyLabels.roomCount") : tw("propertyLabels.bedrooms"), bedroomsVal);
  const livingRoomsVal = (listing as any).livingRooms ?? (listing as any).living_rooms;
  pushRow("livingRooms", tw("propertyLabels.livingRooms"), livingRoomsVal);
  pushRow("bathrooms", tw("propertyLabels.bathrooms"), (listing as any).bathrooms);
  if (isKonutListing) pushRow("toilets", "WC", (listing as any).toilets ?? 0);

  const isArsaListing = listingPropertyTypeIsArsa(propertyTypeRaw);
  if (isArsaListing) {
    // Arsa/arazi: imar oranı + alan birlikte gösterilir.
    const imarOran = parseLandFieldsFromDetailFields(listing.detailFields).toplamImarOrani;
    if (imarOran) pushRow("imarOran", "İmar oranı", /%$/.test(imarOran) ? imarOran : `${imarOran}%`);
  }
  const areaVal = (listing as any).areaM2 ?? (listing as any).area_m2;
  if (areaVal != null && Number(areaVal) > 0) pushRow("areaM2", isArsaListing ? "İmar alanı (m²)" : tw("propertyLabels.areaM2"), `${Number(areaVal)} m²`);
  const plotAreaVal = (listing as any).plotAreaM2 ?? (listing as any).plot_area_m2;
  if (plotAreaVal != null && Number(plotAreaVal) > 0) pushRow("plotAreaM2", tw("propertyLabels.plotAreaM2"), `${Number(plotAreaVal)} m²`);

  const floorDisplay = normalizeFloorFromListing((listing as any).floor);
  pushRow("floor", tw("propertyLabels.floor"), floorDisplay);
  pushRow("buildingAge", tw("propertyLabels.buildingAge"), buildingAgeDisplay);

  const allDetailRows = [...structuredRows, ...detailRows];
  const features = mergeListingHighlightLines(listing as Record<string, unknown>);
  const nearbyManual = parseNearby(listing.nearbyPlaces);
  const nearbyAuto = listing.nearbyEnabled ? await getNearbyPoiRowsForListing(listing) : [];
  const showNearbySection =
    listing.nearbyEnabled && (nearbyAuto.length > 0 || nearbyManual.length > 0);

  const SIMILAR_LIMIT = 4;
  const consultantRaw = await getListingsByConsultantSafe(
    listing.id,
    {
      agentId: (listing as any).createdByAgentId ?? (listing as any).created_by_agent_id,
      consultantName: listing.consultantName,
      consultantPhone: listing.consultantPhone,
    },
    SIMILAR_LIMIT,
  );
  let similarRaw = consultantRaw;
  if (similarRaw.length < SIMILAR_LIMIT) {
    const fillRaw = await getSimilarListingsSafe(
      listing.id,
      listing.city,
      listing.kind,
      listing.propertyType ?? (listing as any).property_type,
      listing.region,
      SIMILAR_LIMIT,
    );
    const seen = new Set(similarRaw.map(l => l.id));
    similarRaw = [...similarRaw, ...fillRaw.filter(l => !seen.has(l.id))].slice(0, SIMILAR_LIMIT);
  }
  const similar = similarRaw.map(l => getTranslatedListing(l, locale));

  const locLine = [
    displayListingRegionOrNeighborhood(listing.neighborhood),
    displayListingRegionOrNeighborhood(listing.region),
    displayListingCity(listing.city),
    tc("cyprus")
  ].filter(Boolean).join(", ");

  const kindLabel = tc(`listingKinds.${listing.kind}`);

  return (
    <main className="mx-auto max-w-[1440px] flex-1 bg-surface px-6 py-10 md:px-8 lg:py-14">
      {listing.publishStatus !== "PUBLISHED" && access.mode !== "none" ? (
        <div className="mb-4 rounded-lg bg-amber-100 px-4 py-2 text-sm text-amber-900">
          {listing.publishStatus === "DRAFT"
            ? t("isDraft")
            : listing.publishStatus === "PENDING_APPROVAL"
              ? t("isPendingApproval")
              : t("isHidden")}
        </div>
      ) : null}

      <nav className="flex flex-wrap gap-1 font-headline text-xs uppercase tracking-wider text-on-surface/45">
        <Link href="/" className="hover:text-secondary">
          {tc("home")}
        </Link>
        <span>/</span>
        <Link
          href={`/ilanlar?tur=${listing.kind === "SATILIK" ? "satilik" : listing.kind === "KIRALIK" ? "kiralik" : listing.kind === "GUNLUK_KIRALIK" ? "gunluk" : "proje"}`}
          className="hover:text-secondary"
        >
          {kindLabel}
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

      <PhotoGallery 
        images={images} 
        primaryImage={primaryImageUrl(listing)} 
        badgeVirtualTour={listing.badgeVirtualTour} 
        virtualTourEnabled={listing.virtualTourEnabled} 
      />

      <div className="mt-10 flex flex-col gap-10 lg:grid lg:grid-cols-12">
        <div className="order-1 lg:order-none lg:col-span-8 lg:col-start-1 lg:row-start-1">
          <div className="flex flex-col gap-4 pb-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-headline text-2xl font-extrabold tracking-tight text-primary sm:text-3xl md:text-4xl">{listing.title}</h1>
              <p className="mt-2 text-sm font-semibold text-primary">{locLine}</p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
              <ListingPriceWithFx
                price={Number(listing.price ?? 0)}
                currency={listing.currency ?? "EUR"}
                variant="detail"
                note={
                  landPriceIsPerDonumFromDetailFields(listing.detailFields)
                    ? t("priceNotePerDonum")
                    : undefined
                }
              />
              <div className="flex gap-2">
                <ListingShareButton title={listing.title} label={t("share")} copiedMessage={t("shareCopied")} />
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-6 text-sm font-semibold text-primary">
            {listing.bedrooms != null ? (
              <div className="flex items-center gap-2">
                <span className="text-lg">🛏</span>
                <span>{listing.bedrooms} {tc("bedrooms")}</span>
              </div>
            ) : null}
            {listing.bathrooms != null ? (
              <div className="flex items-center gap-2">
                <span className="text-lg">🛁</span>
                <span>{listing.bathrooms} {tc("bathrooms")}</span>
              </div>
            ) : null}
            {isKonutListing ? (
              <div className="flex items-center gap-2">
                <span className="text-lg">🚽</span>
                <span>{listing.toilets ?? 0} WC</span>
              </div>
            ) : null}
            {listing.areaM2 != null ? (
              <div className="flex items-center gap-2">
                <span className="text-lg">⬛</span>
                <span>{isArsaListing ? "İmar alanı " : ""}{listing.areaM2} m²</span>
              </div>
            ) : null}
          </div>

          {allDetailRows.length ? (
            <div className="mt-10 rounded-2xl bg-surface-lowest p-6 shadow-[var(--shadow-ambient)] ring-1 ring-primary/[0.1]">
              <h2 className="font-headline text-lg font-bold text-primary">{t("info")}</h2>
              <dl className="mt-4 grid gap-x-8 gap-y-1 sm:grid-cols-2">
                {allDetailRows.map((r) => (
                  <div key={r.key} className="flex justify-between gap-4 rounded-lg py-2.5 text-sm">
                    <dt className="text-on-surface/50">{r.label}</dt>
                    <dd className="font-medium text-primary">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {access.mode !== "none" ? (
            <div className="mt-8 rounded-2xl bg-surface-lowest p-6 shadow-[var(--shadow-ambient)] ring-1 ring-primary/[0.1]">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-headline text-lg font-bold text-primary">{t("summary")}</h2>
                <span className="rounded-md bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                  {tc("adminUser") || "Yönetici"}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="font-headline text-2xl font-bold text-primary">
                    {(Number(listing.views ?? 0) || 0).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}
                  </p>
                  <p className="text-xs text-on-surface/50">{t("views")}</p>
                </div>
                {listing.rating != null ? (
                  <div>
                    <p className="font-headline text-2xl font-bold text-primary">{listing.rating}</p>
                    <p className="text-xs text-on-surface/50">{t("points")}</p>
                  </div>
                ) : null}
                <div>
                  <p className="font-headline text-2xl font-bold text-primary">{daysAgo(listing.created_at ?? listing.createdAt)}</p>
                  <p className="text-xs text-on-surface/50">{t("addedDaysAgo")}</p>
                </div>
                <div>
                  <p className="font-headline text-2xl font-bold text-primary">{daysAgo(listing.updated_at ?? listing.updatedAt)}</p>
                  <p className="text-xs text-on-surface/50">{t("updatedDaysAgo")}</p>
                </div>
              </div>
            </div>
          ) : null}

          {listing.longDescription ? (
            <div className="mt-10">
              <h2 className="font-headline text-lg font-bold text-primary">
                {listingPropertyTypeDisplayLabel(String(listing.propertyType ?? ""))} {t("description")}
              </h2>
              <div
                className="mt-4 max-w-none text-base leading-relaxed text-primary [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1 [&_strong]:font-bold [&_em]:italic [&_u]:underline"
                dangerouslySetInnerHTML={{ __html: listing.longDescription }}
              />
            </div>
          ) : null}

          {features.length ? (
            <div className="mt-10 rounded-2xl bg-surface-low p-6 shadow-[var(--shadow-ambient)] ring-1 ring-primary/[0.08]">
              <h2 className="font-headline text-lg font-bold text-primary">{t("highlights")}</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm font-semibold text-primary">
                    <span className="text-secondary">•</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {listing.videoEnabled && listing.videoUrl ? (
            <section id="video" className="mt-12 scroll-mt-28">
              <h2 className="font-headline text-lg font-bold text-primary">{t("video")}</h2>
              {toVideoEmbedUrl(listing.videoUrl) ? (
                <div className="mt-4 aspect-video overflow-hidden rounded-2xl bg-surface-low">
                  <iframe
                    title={tc("videoTitle")}
                    className="h-full w-full"
                    src={toVideoEmbedUrl(listing.videoUrl)!}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <a href={listing.videoUrl} className="mt-4 inline-block text-sm font-semibold text-secondary hover:underline" target="_blank" rel="noopener noreferrer">
                  {tc("readMore")} →
                </a>
              )}
            </section>
          ) : null}

          {listing.virtualTourEnabled && listing.virtualTourUrl ? (
            <section className="mt-12">
              <h2 className="font-headline text-lg font-bold text-primary">{t("virtualTour")}</h2>
              <a
                href={listing.virtualTourUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative mt-4 block aspect-video overflow-hidden rounded-2xl bg-zinc-900"
              >
                <Image src={primaryImageUrl(listing)} alt="" fill className="object-cover opacity-70" sizes="100vw" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <span className="text-5xl">▶</span>
                  <span className="mt-2 font-semibold">{t("startTour")}</span>
                </div>
              </a>
            </section>
          ) : null}
        </div>

        <div className="order-3 lg:order-none lg:col-span-8 lg:col-start-1 lg:row-start-2">
          {listing.mapEnabled && listing.lat != null && listing.lng != null ? (
            <section>
              <h2 className="font-headline text-lg font-bold text-primary">{t("locationMap")}</h2>
              <iframe
                title={tc("locationTitle")}
                className="mt-4 h-[420px] w-full rounded-2xl ring-1 ring-primary/[0.12]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${listing.lat},${listing.lng}&z=14&output=embed`}
              />
            </section>
          ) : null}

          {showNearbySection ? (
            <section className="mt-12">
              <h2 className="font-headline text-lg font-bold text-primary">{t("nearby")}</h2>
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
                    <h3 className="mt-8 font-headline text-base font-bold text-primary">{t("extraInfo")}</h3>
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

        </div>

        <aside className="order-2 lg:order-none lg:col-span-4 lg:col-start-9 lg:row-start-1">
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
                {consultant.phone ? <ConsultantPhoneCta phone={consultant.phone} showLabel={t("showPhone")} /> : null}
                <Link
                  href={`/iletisim?listing=${encodeURIComponent(listing.listingId)}`}
                  className="block w-full rounded-xl bg-surface-high py-3 text-center text-sm font-semibold text-primary ring-1 ring-primary/[0.12] transition hover:bg-surface-highest"
                >
                  {t("sendMessage")}
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
                <Link href={consultantListingsHref} className="block text-secondary hover:underline">
                  {t("otherListings")}
                </Link>
                <Link href="/ilanlar" className="block text-secondary hover:underline">
                  {t("officeListings")}
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {similar.length ? (
        <section className="mt-14">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-headline text-xl font-bold text-primary">{t("similarListings")}</h2>
            <Link
              href={consultantListingsHref}
              className="shrink-0 text-sm font-semibold text-secondary hover:underline"
            >
              {t("seeMore")} →
            </Link>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((l) => (
              <PropertyCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
