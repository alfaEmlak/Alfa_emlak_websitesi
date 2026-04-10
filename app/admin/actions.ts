"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";
import { defaultMegaMenu } from "@/lib/default-menu";
import type { MenuTopItem } from "@/lib/default-menu";
import { customAlphabet } from "nanoid";

const idAlphabet = customAlphabet("0123456789", 5);

export async function loginAdmin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const session = await getAdminSession();
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected || password !== expected) {
    redirect("/admin?e=1");
  }
  session.isAdmin = true;
  await session.save();
  redirect("/admin/dashboard");
}

export async function logoutAdmin() {
  const session = await getAdminSession();
  session.destroy();
  redirect("/admin");
}

export type ListingSavePayload = {
  id?: string;
  listingId: string;
  title: string;
  kind: string;
  propertyType: string;
  city: string;
  region: string;
  neighborhood: string;
  fullAddress: string;
  price: number;
  currency: string;
  shortDescription: string;
  longDescription: string;
  coverImage: string;
  bedrooms: string;
  bathrooms: string;
  areaM2: string;
  plotAreaM2: string;
  floor: string;
  buildingAge: string;
  livingRooms: string;
  hasPool: boolean;
  hasGarden: boolean;
  hasFireplace: boolean;
  hasParking: boolean;
  furnished: boolean;
  seaView: boolean;
  detailFields: string;
  features: string;
  nearbyPlaces: string;
  nearbyEnabled: boolean;
  /** JSON veya boş — null için tüm POI kategorileri açık */
  nearbyPoiCategoriesJson: string;
  badgeFeatured: boolean;
  badgeExclusive: boolean;
  badgeVirtualTour: boolean;
  badgeVideo: boolean;
  badgeNew: boolean;
  badgePriceDrop: boolean;
  virtualTourUrl: string;
  virtualTourEnabled: boolean;
  videoUrl: string;
  videoEnabled: boolean;
  lat: string;
  lng: string;
  mapEnabled: boolean;
  consultantName: string;
  consultantPhone: string;
  consultantWhatsapp: string;
  consultantEmail: string;
  consultantOffice: string;
  consultantPhoto: string;
  consultantOfficeLogo: string;
  publishStatus: string;
  statsShowViews: boolean;
  statsShowFavs: boolean;
  statsShowRating: boolean;
  rating: string;
  favoritesCount: number;
  gallery: { url: string; sortOrder: number; isPrimary: boolean }[];
};

function numOrNull(s: string) {
  const n = Number(s);
  return s === "" || Number.isNaN(n) ? null : n;
}

function intOrNull(s: string) {
  const n = parseInt(s, 10);
  return s === "" || Number.isNaN(n) ? null : n;
}

export async function saveListing(payload: ListingSavePayload) {
  const session = await getAdminSession();
  if (!session.isAdmin) throw new Error("Yetkisiz");

  const gallery = payload.gallery.filter((g) => g.url.trim() !== "");

  const data = {
    listingId: payload.listingId.trim(),
    title: payload.title.trim(),
    kind: payload.kind,
    propertyType: payload.propertyType.trim(),
    city: payload.city.trim(),
    region: payload.region.trim(),
    neighborhood: payload.neighborhood.trim() || null,
    fullAddress: payload.fullAddress.trim() || null,
    price: payload.price,
    currency: payload.currency || "EUR",
    shortDescription: payload.shortDescription.trim() || null,
    longDescription: payload.longDescription.trim() || null,
    coverImage: payload.coverImage.trim() || null,
    bedrooms: intOrNull(payload.bedrooms),
    bathrooms: intOrNull(payload.bathrooms),
    areaM2: numOrNull(payload.areaM2),
    plotAreaM2: numOrNull(payload.plotAreaM2),
    floor: payload.floor.trim() || null,
    buildingAge: intOrNull(payload.buildingAge),
    livingRooms: intOrNull(payload.livingRooms),
    hasPool: payload.hasPool,
    hasGarden: payload.hasGarden,
    hasFireplace: payload.hasFireplace,
    hasParking: payload.hasParking,
    furnished: payload.furnished,
    seaView: payload.seaView,
    detailFields: payload.detailFields.trim() || null,
    features: payload.features.trim() || null,
    nearbyPlaces: payload.nearbyPlaces.trim() || null,
    nearbyEnabled: payload.nearbyEnabled,
    nearbyPoiCategoriesJson: payload.nearbyPoiCategoriesJson.trim() || null,
    badgeFeatured: payload.badgeFeatured,
    badgeExclusive: payload.badgeExclusive,
    badgeVirtualTour: payload.badgeVirtualTour,
    badgeVideo: payload.badgeVideo,
    badgeNew: payload.badgeNew,
    badgePriceDrop: payload.badgePriceDrop,
    virtualTourUrl: payload.virtualTourUrl.trim() || null,
    virtualTourEnabled: payload.virtualTourEnabled,
    videoUrl: payload.videoUrl.trim() || null,
    videoEnabled: payload.videoEnabled,
    lat: numOrNull(payload.lat),
    lng: numOrNull(payload.lng),
    mapEnabled: payload.mapEnabled,
    consultantName: payload.consultantName.trim() || null,
    consultantPhone: payload.consultantPhone.trim() || null,
    consultantWhatsapp: payload.consultantWhatsapp.trim() || null,
    consultantEmail: payload.consultantEmail.trim() || null,
    consultantOffice: payload.consultantOffice.trim() || null,
    consultantPhoto: payload.consultantPhoto.trim() || null,
    consultantOfficeLogo: payload.consultantOfficeLogo.trim() || null,
    publishStatus: payload.publishStatus,
    statsShowViews: payload.statsShowViews,
    statsShowFavs: payload.statsShowFavs,
    statsShowRating: payload.statsShowRating,
    rating: numOrNull(payload.rating),
    favoritesCount: payload.favoritesCount,
  };

  if (payload.id) {
    await prisma.listingImage.deleteMany({ where: { listingId: payload.id } });
    await prisma.listing.update({
      where: { id: payload.id },
      data: {
        ...data,
        images: {
          create: gallery.map((g) => ({
            url: g.url,
            sortOrder: g.sortOrder,
            isPrimary: g.isPrimary,
          })),
        },
      },
    });
  } else {
    await prisma.listing.create({
      data: {
        ...data,
        images: {
          create: gallery.map((g) => ({
            url: g.url,
            sortOrder: g.sortOrder,
            isPrimary: g.isPrimary,
          })),
        },
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/ilanlar");
  revalidatePath(`/ilan/${payload.listingId}`);
  return { ok: true as const };
}

export async function deleteListing(id: string) {
  const session = await getAdminSession();
  if (!session.isAdmin) throw new Error("Yetkisiz");
  await prisma.listing.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/ilanlar");
  return { ok: true as const };
}

export async function suggestListingId() {
  const y = new Date().getFullYear();
  return `AE-${y}-${idAlphabet()}`;
}

export async function saveSiteSettings(formData: FormData) {
  const session = await getAdminSession();
  if (!session.isAdmin) throw new Error("Yetkisiz");

  const social = {
    facebook: String(formData.get("social_facebook") ?? "").trim(),
    instagram: String(formData.get("social_instagram") ?? "").trim(),
    linkedin: String(formData.get("social_linkedin") ?? "").trim(),
    youtube: String(formData.get("social_youtube") ?? "").trim(),
  };

  const consultant = {
    name: String(formData.get("dc_name") ?? "").trim(),
    phone: String(formData.get("dc_phone") ?? "").trim(),
    whatsapp: String(formData.get("dc_whatsapp") ?? "").trim(),
    email: String(formData.get("dc_email") ?? "").trim(),
    office: String(formData.get("dc_office") ?? "").trim(),
    photo: String(formData.get("dc_photo") ?? "").trim(),
    logo: String(formData.get("dc_logo") ?? "").trim(),
  };

  await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      siteName: String(formData.get("siteName") ?? "ALFA EMLAK"),
      logoUrl: String(formData.get("logoUrl") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      whatsapp: String(formData.get("whatsapp") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      footerAbout: String(formData.get("footerAbout") ?? "").trim() || null,
      seoTitle: String(formData.get("seoTitle") ?? "").trim() || null,
      seoDescription: String(formData.get("seoDescription") ?? "").trim() || null,
      heroTitle: String(formData.get("heroTitle") ?? "").trim() || null,
      heroSubtitle: String(formData.get("heroSubtitle") ?? "").trim() || null,
      socialJson: JSON.stringify(social),
      defaultConsultantJson: JSON.stringify(consultant),
      menuJson: JSON.stringify(defaultMegaMenu),
    },
    update: {
      siteName: String(formData.get("siteName") ?? "ALFA EMLAK"),
      logoUrl: String(formData.get("logoUrl") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      whatsapp: String(formData.get("whatsapp") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      footerAbout: String(formData.get("footerAbout") ?? "").trim() || null,
      seoTitle: String(formData.get("seoTitle") ?? "").trim() || null,
      seoDescription: String(formData.get("seoDescription") ?? "").trim() || null,
      heroTitle: String(formData.get("heroTitle") ?? "").trim() || null,
      heroSubtitle: String(formData.get("heroSubtitle") ?? "").trim() || null,
      socialJson: JSON.stringify(social),
      defaultConsultantJson: JSON.stringify(consultant),
    },
  });

  revalidatePath("/");
  revalidatePath("/admin/ayarlar");
  revalidatePath("/iletisim");
}

export async function saveMenuJson(json: string) {
  const session = await getAdminSession();
  if (!session.isAdmin) throw new Error("Yetkisiz");
  let parsed: MenuTopItem[];
  try {
    parsed = JSON.parse(json) as MenuTopItem[];
    if (!Array.isArray(parsed)) throw new Error("invalid");
  } catch {
    return { ok: false as const, message: "Geçersiz JSON." };
  }
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: { id: 1, menuJson: JSON.stringify(parsed) },
    update: { menuJson: JSON.stringify(parsed) },
  });
  revalidatePath("/");
  revalidatePath("/admin/menu");
  return { ok: true as const };
}
