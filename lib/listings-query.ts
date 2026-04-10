import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { ListingKind } from "@/lib/listing-kinds";

export const listingPublicInclude = { images: true } as const;

export type ListingPublic = Prisma.ListingGetPayload<{
  include: typeof listingPublicInclude;
}>;

const publishedWhere: Prisma.ListingWhereInput = {
  publishStatus: "PUBLISHED",
};

function normalizeCity(raw: string | undefined) {
  if (!raw) return undefined;
  const m: Record<string, string> = {
    girne: "Girne",
    magusa: "Mağusa",
    lefkosa: "Lefkoşa",
    iskele: "İskele",
    lefke: "Lefke",
    guzelyurt: "Güzelyurt",
  };
  return m[raw.toLowerCase()] ?? raw;
}

export function buildListingFilters(sp: Record<string, string | string[] | undefined>) {
  const get = (k: string) => {
    const v = sp[k];
    if (Array.isArray(v)) return v[0];
    return v ?? undefined;
  };

  const where: Prisma.ListingWhereInput = { ...publishedWhere };

  const tur = get("tur");
  if (tur === "satilik") where.kind = "SATILIK";
  else if (tur === "kiralik") where.kind = "KIRALIK";
  else if (tur === "gunluk") where.kind = "GUNLUK_KIRALIK";
  else if (tur === "proje") where.kind = "PROJE";

  const sehir = normalizeCity(get("sehir"));
  if (sehir) where.city = sehir;

  const bolge = get("bolge");
  if (bolge && bolge !== "tum-kibris") {
    where.region = { contains: bolge };
  }

  const q = get("q");

  const priceFilter: Prisma.FloatFilter = {};
  const minPrice = get("minFiyat");
  const maxPrice = get("maxFiyat");
  if (minPrice) priceFilter.gte = Number(minPrice);
  if (maxPrice) priceFilter.lte = Number(maxPrice);
  if (Object.keys(priceFilter).length > 0) where.price = priceFilter;

  const minRooms = get("minOda");
  if (minRooms) where.bedrooms = { gte: Number(minRooms) };

  const extraAnd: Prisma.ListingWhereInput[] = [];
  if (q) {
    extraAnd.push({
      OR: [
        { title: { contains: q } },
        { listingId: { contains: q } },
        { region: { contains: q } },
      ],
    });
  }

  const emlak = get("emlak");
  if (emlak === "arsa") where.propertyType = { contains: "arsa" };
  else if (emlak === "ticari") where.propertyType = { contains: "ticari" };
  else if (emlak === "konut") {
    extraAnd.push({
      OR: [
        { propertyType: { contains: "Daire" } },
        { propertyType: { contains: "Villa" } },
        { propertyType: { contains: "Konut" } },
        { propertyType: { contains: "Müstakil" } },
      ],
    });
  }

  if (extraAnd.length) {
    where.AND = Array.isArray(where.AND)
      ? [...where.AND, ...extraAnd]
      : where.AND
        ? [where.AND, ...extraAnd]
        : extraAnd;
  }

  return where;
}

export async function findPublishedListings(
  where: Prisma.ListingWhereInput,
  take = 12,
  skip = 0,
) {
  return prisma.listing.findMany({
    where: { AND: [publishedWhere, where] },
    include: listingPublicInclude,
    orderBy: [{ badgeFeatured: "desc" }, { createdAt: "desc" }],
    take,
    skip,
  });
}

export async function countPublished(where: Prisma.ListingWhereInput) {
  return prisma.listing.count({
    where: { AND: [publishedWhere, where] },
  });
}

export async function getFeaturedListings(limit = 8) {
  return prisma.listing.findMany({
    where: {
      ...publishedWhere,
      badgeFeatured: true,
    },
    include: listingPublicInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/** DB kapalı / yol hatalı / sunucusuz ortamda ana sayfa 500 vermesin. */
export async function getFeaturedListingsSafe(limit = 8): Promise<ListingPublic[]> {
  try {
    return await getFeaturedListings(limit);
  } catch (e) {
    console.error("[getFeaturedListingsSafe]", e);
    return [];
  }
}

export async function findPublishedListingsSafe(
  where: Prisma.ListingWhereInput,
  take = 12,
  skip = 0,
): Promise<ListingPublic[]> {
  try {
    return await findPublishedListings(where, take, skip);
  } catch (e) {
    console.error("[findPublishedListingsSafe]", e);
    return [];
  }
}

export async function countPublishedSafe(where: Prisma.ListingWhereInput): Promise<number> {
  try {
    return await countPublished(where);
  } catch (e) {
    console.error("[countPublishedSafe]", e);
    return 0;
  }
}

export async function getLatestByKind(kind: ListingKind, limit = 4) {
  return prisma.listing.findMany({
    where: { ...publishedWhere, kind },
    include: listingPublicInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getListingByPublicId(listingId: string, allowDraftForAdmin: boolean) {
  const base = await prisma.listing.findFirst({
    where: { listingId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!base) return null;
  if (base.publishStatus !== "PUBLISHED" && !allowDraftForAdmin) return null;
  return base;
}

export async function getListingByPublicIdSafe(listingId: string, allowDraftForAdmin: boolean) {
  try {
    return await getListingByPublicId(listingId, allowDraftForAdmin);
  } catch (e) {
    console.error("[getListingByPublicIdSafe]", e);
    return null;
  }
}

export async function getSimilarListings(
  excludeId: string,
  city: string,
  kind: string,
  limit = 4,
) {
  return prisma.listing.findMany({
    where: {
      ...publishedWhere,
      NOT: { id: excludeId },
      city,
      kind,
    },
    include: listingPublicInclude,
    take: limit,
    orderBy: { createdAt: "desc" },
  });
}

export async function getSimilarListingsSafe(
  excludeId: string,
  city: string,
  kind: string,
  limit = 4,
): Promise<ListingPublic[]> {
  try {
    return await getSimilarListings(excludeId, city, kind, limit);
  } catch (e) {
    console.error("[getSimilarListingsSafe]", e);
    return [];
  }
}
