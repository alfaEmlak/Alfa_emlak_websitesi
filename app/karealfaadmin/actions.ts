"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/admin-auth";
import { defaultMegaMenu } from "@/lib/default-menu";
import type { MenuTopItem } from "@/lib/default-menu";
import { menuTopItemsSchema } from "@/lib/menu-schema";
import { customAlphabet } from "nanoid";

export async function loginAdmin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const session = await getAdminSession();
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected || password !== expected) {
    redirect("/karealfaadmin?e=1");
  }
  session.isAdmin = true;
  await session.save();
  redirect("/karealfaadmin/dashboard");
}

export async function logoutAdmin() {
  const session = await getAdminSession();
  session.destroy();
  redirect("/karealfaadmin");
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
  translations: string;
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
    listing_id: payload.listingId?.trim() || "",
    title: payload.title?.trim() || "",
    kind: payload.kind,
    property_type: payload.propertyType?.trim() || "",
    city: payload.city?.trim() || "",
    region: payload.region?.trim() || "",
    neighborhood: payload.neighborhood?.trim() || null,
    full_address: payload.fullAddress?.trim() || null,
    price: payload.price,
    currency: payload.currency || "EUR",
    description_tr: payload.shortDescription?.trim() || null,
    description_en: payload.longDescription?.trim() || null,
    cover_image: payload.coverImage?.trim() || null,
    bedrooms: intOrNull(payload.bedrooms),
    bathrooms: intOrNull(payload.bathrooms),
    area_m2: numOrNull(payload.areaM2),
    plot_area_m2: numOrNull(payload.plotAreaM2),
    floor: payload.floor || null,
    building_age: intOrNull(payload.buildingAge),
    living_rooms: intOrNull(payload.livingRooms),
    has_pool: payload.hasPool,
    has_garden: payload.hasGarden,
    has_fireplace: payload.hasFireplace,
    has_parking: payload.hasParking,
    furnished: payload.furnished,
    sea_view: payload.seaView,
    detail_fields: payload.detailFields?.trim() ? payload.detailFields : null,
    features: payload.features?.trim() ? JSON.parse(payload.features) : null,
    virtual_tour_url: payload.virtualTourUrl?.trim() || null,
    virtual_tour_enabled: payload.virtualTourEnabled,
    video_url: payload.videoUrl?.trim() || null,
    video_enabled: payload.videoEnabled,
    latitude: numOrNull(payload.lat),
    longitude: numOrNull(payload.lng),
    map_enabled: payload.mapEnabled,
    nearby_places: payload.nearbyPlaces ? JSON.parse(payload.nearbyPlaces) : null,
    nearby_enabled: payload.nearbyEnabled,
    nearby_poi_categories_json: payload.nearbyPoiCategoriesJson || null,
    badges: {
      featured: payload.badgeFeatured,
      exclusive: payload.badgeExclusive,
      virtualTour: payload.badgeVirtualTour,
      video: payload.badgeVideo,
      new: payload.badgeNew,
      priceDrop: payload.badgePriceDrop,
    },
    publish_status: payload.publishStatus,
    favorites_count: payload.favoritesCount,
    rating: numOrNull(payload.rating) || 0,
    stats_show_views: payload.statsShowViews,
    stats_show_favs: payload.statsShowFavs,
    stats_show_rating: payload.statsShowRating,
    consultant_name: payload.consultantName?.trim() || null,
    consultant_phone: payload.consultantPhone?.trim() || null,
    consultant_whatsapp: payload.consultantWhatsapp?.trim() || null,
    consultant_email: payload.consultantEmail?.trim() || null,
    consultant_office: payload.consultantOffice?.trim() || null,
    consultant_photo: payload.consultantPhoto?.trim() || null,
    consultant_office_logo: payload.consultantOfficeLogo?.trim() || null,
    translations: payload.translations?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  console.log("[saveListing] Saving data:", JSON.stringify(data, null, 2));

  if (payload.id) {
    // Update existing listing
    const { error } = await supabaseAdmin
      .from("listings")
      .update(data)
      .eq("id", payload.id);
    
    if (error) {
      console.error("[saveListing] Update error:", error);
      throw new Error(`İlan güncellenemedi: ${error.message}`);
    }

    // Delete old images
    const { error: deleteImgError } = await supabaseAdmin
      .from("listing_images")
      .delete()
      .eq("listing_id", payload.id);

    if (deleteImgError) {
      console.error("[saveListing] Delete images error:", deleteImgError);
    }

    // Insert new images
    if (gallery.length > 0) {
      const images = gallery.map(g => ({
        listing_id: payload.id,
        url: g.url,
        sort_order: g.sortOrder,
        is_primary: g.isPrimary,
      }));

      const { error: imgError } = await supabaseAdmin
        .from("listing_images")
        .insert(images);
      
      if (imgError) {
        console.error("[saveListing] Insert images error:", imgError);
        throw new Error(`Fotoğraflar eklenemedi: ${imgError.message}`);
      }
    }
  } else {
    // Create new listing
    const { data: newListing, error } = await supabaseAdmin
      .from("listings")
      .insert(data)
      .select()
      .single();
    
    if (error) {
      console.error("[saveListing] Insert error:", error);
      if (error.code === "23505") {
        throw new Error(`"${payload.listingId}" numaralı ilan zaten mevcut. Lütfen farklı bir ilan numarası girin.`);
      }
      throw new Error(`İlan oluşturulamadı: ${error.message}`);
    }

    console.log("[saveListing] Created listing:", newListing);

    // Insert images
    if (gallery.length > 0) {
      const images = gallery.map(g => ({
        listing_id: newListing.id,
        url: g.url,
        sort_order: g.sortOrder,
        is_primary: g.isPrimary,
      }));

      const { error: imgError } = await supabaseAdmin
        .from("listing_images")
        .insert(images);
      
      if (imgError) {
        console.error("[saveListing] Insert images error:", imgError);
        throw new Error(`Fotoğraflar eklenemedi: ${imgError.message}`);
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/ilanlar");
  revalidatePath(`/ilan/${payload.listingId}`);
  return { ok: true as const };
}

export async function deleteListing(id: string) {
  const session = await getAdminSession();
  if (!session.isAdmin) throw new Error("Yetkisiz");
  
  const { error } = await supabaseAdmin
    .from("listings")
    .delete()
    .eq("id", id);
  
  if (error) throw new Error(`Delete failed: ${error.message}`);
  
  revalidatePath("/");
  revalidatePath("/ilanlar");
  return { ok: true as const };
}

export async function suggestListingId() {
  const y = new Date().getFullYear();
  // Try up to 5 times to find a unique ID
  for (let i = 0; i < 5; i++) {
    const id = `AE-${y}-${customAlphabet("0123456789", 5)()}`;
    const { data } = await supabaseAdmin
      .from("listings")
      .select("id")
      .eq("listing_id", id)
      .single();
    if (!data) return id;
  }
  // Fallback with timestamp
  return `AE-${y}-${Date.now().toString().slice(-6)}`;
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

  const locales = ["en", "ru", "de", "fa"];
  const translations: Record<string, any> = {};

  for (const lang of locales) {
    const siteName = String(formData.get(`siteName_${lang}`) ?? "").trim();
    const address = String(formData.get(`address_${lang}`) ?? "").trim();
    const heroTitle = String(formData.get(`heroTitle_${lang}`) ?? "").trim();
    const heroSubtitle = String(formData.get(`heroSubtitle_${lang}`) ?? "").trim();
    const footerAbout = String(formData.get(`footerAbout_${lang}`) ?? "").trim();
    const seoTitle = String(formData.get(`seoTitle_${lang}`) ?? "").trim();
    const seoDescription = String(formData.get(`seoDescription_${lang}`) ?? "").trim();

    if (siteName || address || heroTitle || heroSubtitle || footerAbout || seoTitle || seoDescription) {
      translations[lang] = {
        siteName: siteName || null,
        address: address || null,
        heroTitle: heroTitle || null,
        heroSubtitle: heroSubtitle || null,
        footerAbout: footerAbout || null,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
      };
    }
  }

  const settingsData = {
    site_name: String(formData.get("siteName") ?? "ALFA EMLAK"),
    logo_url: String(formData.get("logoUrl") ?? "").trim() || null,
    contact_phone: String(formData.get("phone") ?? "").trim() || null,
    contact_email: String(formData.get("email") ?? "").trim() || null,
    contact_address: String(formData.get("address") ?? "").trim() || null,
    footer_about: String(formData.get("footerAbout") ?? "").trim() || null,
    seo_meta_title: String(formData.get("seoTitle") ?? "").trim() || null,
    seo_meta_description: String(formData.get("seoDescription") ?? "").trim() || null,
    hero_title: String(formData.get("heroTitle") ?? "").trim() || null,
    hero_subtitle: String(formData.get("heroSubtitle") ?? "").trim() || null,
    social_json: JSON.stringify(social),
    default_consultant_json: JSON.stringify(consultant),
    menu_json: JSON.stringify(defaultMegaMenu),
    translations: Object.keys(translations).length > 0 ? JSON.stringify(translations) : null,
    updated_at: new Date().toISOString(),
  };

  // Check if settings exist
  const { data: existing } = await supabaseAdmin
    .from("site_settings")
    .select("id")
    .eq("id", 1)
    .single();

  if (existing) {
    const { error } = await supabaseAdmin
      .from("site_settings")
      .update(settingsData)
      .eq("id", 1);
    
    if (error) throw new Error(`Settings update failed: ${error.message}`);
  } else {
    const { error } = await supabaseAdmin
      .from("site_settings")
      .insert({ id: 1, ...settingsData });
    
    if (error) throw new Error(`Settings insert failed: ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/karealfaadmin/ayarlar");
  revalidatePath("/iletisim");
  revalidatePath("/", "layout");
}

export async function saveMenuJson(json: string) {
  const session = await getAdminSession();
  if (!session.isAdmin) throw new Error("Yetkisiz");
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    return { ok: false as const, message: "Geçersiz JSON." };
  }
  const validated = menuTopItemsSchema.safeParse(parsed);
  if (!validated.success) {
    const first = validated.error.issues[0];
    const path = first?.path?.length ? first.path.join(".") : "menü";
    return { ok: false as const, message: `${path}: ${first?.message ?? "Geçersiz yapı."}` };
  }

  const { data: existing } = await supabaseAdmin
    .from("site_settings")
    .select("id")
    .eq("id", 1)
    .single();

  if (existing) {
    const { error } = await supabaseAdmin
      .from("site_settings")
      .update({ menu_json: JSON.stringify(validated.data), updated_at: new Date().toISOString() })
      .eq("id", 1);
    
    if (error) throw new Error(`Menu update failed: ${error.message}`);
  } else {
    const { error } = await supabaseAdmin
      .from("site_settings")
      .insert({ id: 1, menu_json: JSON.stringify(validated.data) });
    
    if (error) throw new Error(`Menu insert failed: ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/karealfaadmin/menu");
  return { ok: true as const };
}

/* ────────── Vitrin (Featured) Toggle ────────── */

export async function toggleFeatured(listingId: string, featured: boolean) {
  const session = await getAdminSession();
  if (!session.isAdmin) throw new Error("Yetkisiz");

  // Read current badges
  const { data: listing, error: readError } = await supabaseAdmin
    .from("listings")
    .select("badges")
    .eq("id", listingId)
    .single();

  if (readError || !listing) throw new Error(`Listing read failed: ${readError?.message}`);

  let badges: Record<string, boolean> = {};
  try {
    badges = typeof listing.badges === "string" ? JSON.parse(listing.badges) : (listing.badges || {});
  } catch {
    badges = {};
  }

  badges.featured = featured;

  const { error } = await supabaseAdmin
    .from("listings")
    .update({ badges })
    .eq("id", listingId);

  if (error) throw new Error(`Toggle featured failed: ${error.message}`);

  revalidatePath("/karealfaadmin/ilanlar/vitrin");
  revalidatePath("/");
  return { ok: true as const };
}
