import { cache } from "react";
import { ensureListingAutoTranslations } from "@/lib/listing-auto-translate";
import { getListingByPublicIdSafe, type UnpublishedListingAccess } from "@/lib/listings-query";

/** Aynı HTTP isteğinde metadata + sayfa için tek fetch + tek otomatik çeviri turu */
export const getListingDetailForLocale = cache(async (listingId: string, locale: string, access: UnpublishedListingAccess) => {
  const raw = await getListingByPublicIdSafe(listingId, access);
  if (!raw) return null;
  const enriched = await ensureListingAutoTranslations(raw, locale);
  return enriched;
});
