"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import type { ListingPublic } from "@/lib/listings-query";
import { formatMoney, primaryImageUrl } from "@/lib/listing-utils";
import { titleDeedOwnershipLabel } from "@/lib/title-deed-ownership";
import { useTranslations } from "next-intl";

function Badge({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={`rounded-md px-3 py-1.5 font-headline text-[10px] font-bold uppercase tracking-widest shadow-[var(--shadow-ambient)] ${
        accent ? "bg-secondary text-white" : "bg-surface-lowest text-primary"
      }`}
    >
      {children}
    </span>
  );
}

export function PropertyCard({ listing, stagger }: { listing: ListingPublic; stagger?: boolean }) {
  const t = useTranslations("Common");
  const row = listing as Record<string, unknown>;
  const tapuLabel = titleDeedOwnershipLabel(row.titleDeedOwnership ?? row.title_deed_ownership);
  const img = primaryImageUrl(listing) || "/placeholder-property.svg";
  const isRemote = img.startsWith("http");

  return (
    <article
      className={`property-card-premium group overflow-hidden rounded-t-3xl rounded-b-lg bg-surface-lowest p-4 shadow-[var(--shadow-ambient)] ${stagger ? "md:translate-y-12" : ""}`}
    >
      <div className="relative mb-6 aspect-[4/3] overflow-hidden rounded-t-2xl bg-surface-low">
        <Link href={`/ilan/${listing.listing_id || listing.listingId}`} className="absolute inset-0 z-0 block">
          <Image
            src={img}
            alt={listing.title}
            fill
            sizes="(max-width:768px) 100vw, 33vw"
            className="object-cover grayscale-[0.2] transition-[transform,filter] duration-700 group-hover:scale-[1.02] group-hover:grayscale-0 motion-reduce:transition-none"
            unoptimized={isRemote}
          />
        </Link>
        <div className="pointer-events-none absolute right-4 top-4 z-[1] flex flex-col items-end gap-1">
          {listing.badgeExclusive ? <Badge>{t("exclusive")}</Badge> : null}
          {listing.badgeNew ? <Badge accent>{t("new")}</Badge> : null}
          {listing.badgeFeatured && !listing.badgeExclusive ? <Badge>{t("featured")}</Badge> : null}
          {listing.badgeVirtualTour ? <Badge accent>360°</Badge> : null}
          {listing.badgeVideo ? <Badge>{t("video")}</Badge> : null}
          {listing.badgePriceDrop ? <Badge accent>{t("priceDrop")}</Badge> : null}
        </div>
      </div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <span className="label-sm mb-1 block text-on-surface/45">
            {listing.neighborhood ? `${listing.neighborhood}, ` : ""}
            {listing.region}
            {listing.city ? ` · ${listing.city}` : ""}
          </span>
          <h3 className="font-headline text-xl font-bold leading-tight tracking-tight text-primary">
            <Link
              href={`/ilan/${listing.listingId}`}
              className="rounded-sm hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50"
            >
              {listing.title}
            </Link>
          </h3>
        </div>
        <span className="shrink-0 font-headline text-lg font-extrabold text-primary">
          {formatMoney(listing.price, listing.currency)}
        </span>
      </div>
      <div className="flex flex-wrap gap-6 pt-1">
        {listing.bedrooms != null ? (
          <span className="flex items-center gap-2 font-headline text-[11px] font-semibold uppercase tracking-tighter text-on-surface/50">
            {listing.bedrooms} {t("bedroomsShort")}
          </span>
        ) : null}
        {listing.areaM2 != null || listing.area_m2 != null ? (
          <span className="flex items-center gap-2 font-headline text-[11px] font-semibold uppercase tracking-tighter text-on-surface/50">
            {listing.areaM2 ?? listing.area_m2} m²
          </span>
        ) : null}
        <span className="font-headline text-[11px] font-semibold uppercase tracking-tighter text-on-surface/40">
          {t(`listingKinds.${listing.kind}`)}
        </span>
        {tapuLabel ? (
          <span className="font-headline text-[11px] font-semibold uppercase tracking-tighter text-secondary">
            Tapu: {tapuLabel}
          </span>
        ) : null}
      </div>
    </article>
  );
}
