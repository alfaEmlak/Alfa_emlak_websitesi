import { cache } from "react";
import { ensureListingAutoTranslations } from "@/lib/listing-auto-translate";
import { getListingByPublicIdSafe } from "@/lib/listings-query";

/** Aynı HTTP isteğinde metadata + sayfa için tek fetch + tek otomatik çeviri turu */
export const getListingDetailForLocale = cache(async (listingId: string, locale: string, allowDraftForAdmin: boolean) => {
  const raw = await getListingByPublicIdSafe(listingId, allowDraftForAdmin);
  if (!raw) return null;
  const enriched = await ensureListingAutoTranslations(raw, locale);
  return enriched;
});
