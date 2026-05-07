import Link from "next/link";
import type { ListingPublic } from "@/lib/listings-query";
import { ListingPriceWithFx } from "@/components/site/ListingPriceWithFx";

export function HeroSpotlight({ listing }: { listing: ListingPublic }) {
  const loc = [listing.neighborhood, listing.region].filter(Boolean).join(", ") || listing.city;

  return (
    <Link
      href={`/ilan/${listing.listingId}`}
      className="absolute bottom-8 right-5 z-20 hidden w-[min(100%,19rem)] rounded-xl border border-white/15 bg-primary/45 p-7 shadow-2xl backdrop-blur-2xl transition hover:border-white/25 hover:bg-primary/55 lg:bottom-14 lg:right-10 lg:block lg:w-80"
    >
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-headline text-lg font-bold leading-tight text-white">{listing.title}</h4>
          <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-100/75">{loc}</p>
        </div>
        <div className="shrink-0 text-right">
          <ListingPriceWithFx
            price={Number(listing.price ?? 0)}
            currency={String(listing.currency ?? "EUR")}
            variant="hero"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-6">
        {listing.bedrooms != null ? (
          <div className="flex items-center gap-2 text-white/85">
            <span className="material-symbols-outlined !text-[18px]">bed</span>
            <span className="text-xs font-medium">{listing.bedrooms}</span>
          </div>
        ) : null}
        {listing.bathrooms != null ? (
          <div className="flex items-center gap-2 text-white/85">
            <span className="material-symbols-outlined !text-[18px]">bathtub</span>
            <span className="text-xs font-medium">{listing.bathrooms}</span>
          </div>
        ) : null}
        {listing.areaM2 != null ? (
          <div className="flex items-center gap-2 text-white/85">
            <span className="material-symbols-outlined !text-[18px]">square_foot</span>
            <span className="text-xs font-medium">{Math.round(listing.areaM2)} m²</span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}
