"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPanelSession, requireAdmin, requirePanelUser } from "@/lib/panel-auth";
import { defaultMegaMenu } from "@/lib/default-menu";
import { menuTopItemsSchema } from "@/lib/menu-schema";
import { verifyPassword } from "@/lib/password";
import { isUuidString } from "@/lib/listing-identity";
import { customAlphabet } from "nanoid";

const CONSULTANT_ROLES = ["CONSULTANT", "AGENT"];
const LISTING_STATUSES = ["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "HIDDEN", "REJECTED"] as const;
type ListingStatus = (typeof LISTING_STATUSES)[number];
type ExistingListingForSave = {
  id: string;
  publish_status: string;
  created_by_agent_id: string | null;
  created_by_name: string | null;
};

type ActiveConsultantAccount = {
  id: string;
  name: string;
  role: string;
  password_hash: string;
};

async function findConsultantByPassword(password: string) {
  const { data, error } = await supabaseAdmin
    .from("agents")
    .select("id, name, role, password_hash")
    .eq("is_active", true)
    .in("role", CONSULTANT_ROLES);

  if (error) {
    throw new Error(`Danışman hesabı okunamadı: ${error.message}`);
  }

  const consultants = (data ?? []) as ActiveConsultantAccount[];
  return consultants.find((consultant) => verifyPassword(password, consultant.password_hash)) ?? null;
}

function normalizeRequestedStatus(status: string | undefined): ListingStatus {
  if (status && LISTING_STATUSES.includes(status as ListingStatus)) {
    return status as ListingStatus;
  }

  return "DRAFT";
}

function canPublishDirectly(role: "ADMIN" | "CONSULTANT") {
  return role === "ADMIN";
}

export async function loginAdmin(formData: FormData) {
  const password = String(formData.get("password") ?? "").trim();
  const session = await getPanelSession();
  const expectedAdminPassword = process.env.ADMIN_PASSWORD ?? "";
  const fallbackConsultantPassword = process.env.CONSULTANT_PASSWORD?.trim();
  const fallbackConsultantName = process.env.CONSULTANT_NAME?.trim() || "Panel Danismani";

  if (expectedAdminPassword && password === expectedAdminPassword) {
    session.isAdmin = true;
    session.role = "ADMIN";
    session.agentId = undefined;
    session.name = "Admin";
    await session.save();
    redirect("/karealfaadmin/dashboard");
  }

  const consultant = await findConsultantByPassword(password);

  if (!consultant) {
    if (!fallbackConsultantPassword || password !== fallbackConsultantPassword) {
      redirect("/karealfaadmin?e=1");
    }

    session.isAdmin = false;
    session.role = "CONSULTANT";
    session.agentId = "env-consultant";
    session.name = fallbackConsultantName;
    await session.save();
    redirect("/karealfaadmin/dashboard");
  }

  session.isAdmin = false;
  session.role = "CONSULTANT";
  session.agentId = consultant.id;
  session.name = consultant.name;
  await session.save();
  redirect("/karealfaadmin/dashboard");
}

export async function logoutAdmin() {
  const session = await getPanelSession();
  session.destroy();
  redirect("/karealfaadmin");
}

export type ListingSavePayload = {
  id?: string;
  originalListingId?: string;
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
  exportTo101evler?: boolean;
  ext101evler?: {
    type_id?: number | null;
    area_id?: number | null;
    title_type_id?: number | null;
    room_count_id?: number | null;
    build_age_id?: number | null;
    furnishing_id?: number | null;
    billing_cycle_id?: number | null;
    price_for?: "T" | "U" | null;
    reference_no?: string | null;
  };
  exportToHangiev?: boolean;
  extHangiev?: {
    property_type_id?: number | null;
    area_id?: number | null;
    room_count_id?: number | null;
    build_age_id?: number | null;
    furnishing_id?: number | null;
    price_for?: "T" | "U" | null;
    reference_no?: string | null;
  };
};

function numOrNull(s: string) {
  const n = Number(s);
  return s === "" || Number.isNaN(n) ? null : n;
}

function intOrNull(s: string) {
  const n = parseInt(s, 10);
  return s === "" || Number.isNaN(n) ? null : n;
}

function stripUnsupportedListingColumns<T extends Record<string, unknown>>(payload: T, message: string) {
  const match = message.match(/Could not find the '([^']+)' column/);
  if (!match) {
    return null;
  }

  const [, missingColumn] = match;
  if (!(missingColumn in payload)) {
    return null;
  }

  const nextPayload = { ...payload };
  delete nextPayload[missingColumn as keyof typeof nextPayload];
  return nextPayload;
}

function adaptLegacyListingPayload<T extends Record<string, unknown>>(payload: T, message: string) {
  const stripped = stripUnsupportedListingColumns(payload, message);
  if (stripped) {
    return stripped;
  }

  if (
    message.includes('violates check constraint "listings_publish_status_check"') &&
    payload.publish_status === "PENDING_APPROVAL"
  ) {
    return {
      ...payload,
      publish_status: "HIDDEN",
    };
  }

  return null;
}

async function insertListingWithCompat(payload: Record<string, unknown>) {
  let currentPayload = payload;

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const result = await supabaseAdmin.from("listings").insert(currentPayload).select().single();

    if (!result.error) {
      return result;
    }

    const adapted = adaptLegacyListingPayload(currentPayload, result.error.message);
    if (!adapted) {
      return result;
    }

    currentPayload = adapted;
  }

  return await supabaseAdmin.from("listings").insert(currentPayload).select().single();
}

async function updateListingWithCompat(id: string, payload: Record<string, unknown>) {
  let currentPayload = payload;

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const result = await supabaseAdmin.from("listings").update(currentPayload).eq("id", id);

    if (!result.error) {
      return result;
    }

    const adapted = adaptLegacyListingPayload(currentPayload, result.error.message);
    if (!adapted) {
      return result;
    }

    currentPayload = adapted;
  }

  return await supabaseAdmin.from("listings").update(currentPayload).eq("id", id);
}

async function notifyAdminForApproval(input: {
  actorName: string;
  listingId: string;
  title: string;
  isUpdate: boolean;
}) {
  const actionLabel = input.isUpdate ? "bir ilan guncellemesi gonderdi" : "yeni bir ilan gonderdi";

  await supabaseAdmin.from("contact_messages").insert({
    name: input.actorName,
    email: null,
    phone: null,
    subject: "Ilan Onay Talebi",
    message: `${input.actorName} admin onayi icin ${actionLabel}: ${input.listingId} - ${input.title}`,
    listing_id: input.listingId,
    is_read: false,
  });
}

type ExistingListingRow = Record<string, unknown> & { id?: string | null };

async function findExistingListingForSave(payload: ListingSavePayload): Promise<{
  data: ExistingListingForSave | null;
  error: { message: string; code?: string } | null;
}> {
  const candidates: Array<{ column: "id" | "listing_id"; value: string }> = [];
  const payloadId = payload.id?.trim();
  const publicListingId = payload.listingId?.trim();
  const originalListingId = payload.originalListingId?.trim();

  if (payloadId) {
    if (isUuidString(payloadId)) {
      candidates.push({ column: "id", value: payloadId });
    }
    candidates.push({ column: "listing_id", value: payloadId });
  }

  if (publicListingId && publicListingId !== payloadId) {
    candidates.push({ column: "listing_id", value: publicListingId });
  }

  if (originalListingId && originalListingId !== payloadId && originalListingId !== publicListingId) {
    candidates.push({ column: "listing_id", value: originalListingId });
  }

  const baseSelect = "id, publish_status";
  const richSelect = "id, publish_status, created_by_agent_id, created_by_name";
  let lastError: { message: string; code?: string } | null = null;

  for (const candidate of candidates) {
    let result = await supabaseAdmin
      .from("listings")
      .select(richSelect)
      .eq(candidate.column, candidate.value)
      .maybeSingle();

    if (result.error && result.error.code === "42703") {
      result = await supabaseAdmin
        .from("listings")
        .select(baseSelect)
        .eq(candidate.column, candidate.value)
        .maybeSingle();
    }

    if (result.data) {
      const row = result.data as ExistingListingRow;
      return {
        data: {
          id: String(row.id ?? ""),
          publish_status: String(row.publish_status ?? ""),
          created_by_agent_id:
            typeof row.created_by_agent_id === "string" ? row.created_by_agent_id : null,
          created_by_name:
            typeof row.created_by_name === "string" ? row.created_by_name : null,
        },
        error: null,
      };
    }

    if (result.error) {
      lastError = { message: result.error.message, code: result.error.code };
    }
  }

  return { data: null, error: lastError };
}

export async function saveListing(payload: ListingSavePayload) {
  const user = await requirePanelUser();
  const requestedStatus = normalizeRequestedStatus(payload.publishStatus);
  const finalStatus =
    user.role === "ADMIN"
      ? requestedStatus
      : requestedStatus === "PUBLISHED"
        ? "PENDING_APPROVAL"
        : requestedStatus === "HIDDEN"
          ? "DRAFT"
          : requestedStatus;
  const gallery = payload.gallery.filter((g) => g.url.trim() !== "");
  const now = new Date().toISOString();

  let existingListing: ExistingListingForSave | null = null;

  if (payload.id || payload.originalListingId) {
    const { data, error } = await findExistingListingForSave(payload);

    if (!data) {
      if (error) {
        console.error("[saveListing] findExistingListingForSave error:", error);
        throw new Error(`İlan bulunamadı (${error.message}).`);
      }
      throw new Error("İlan bulunamadı.");
    }

    existingListing = data;
  }

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
    publish_status: finalStatus,
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
    created_by_agent_id: existingListing?.created_by_agent_id ?? (user.role === "CONSULTANT" ? user.agentId : null),
    created_by_name: existingListing?.created_by_name ?? (user.role === "CONSULTANT" ? user.name : "Admin"),
    last_updated_by_agent_id: user.role === "CONSULTANT" ? user.agentId : null,
    last_updated_by_name: user.name,
    approval_submitted_at: finalStatus === "PENDING_APPROVAL" ? now : null,
    approved_at: finalStatus === "PUBLISHED" && canPublishDirectly(user.role) ? now : null,
    approved_by_name: finalStatus === "PUBLISHED" && canPublishDirectly(user.role) ? user.name : null,
    rejected_at: finalStatus === "REJECTED" && canPublishDirectly(user.role) ? now : null,
    rejected_by_name: finalStatus === "REJECTED" && canPublishDirectly(user.role) ? user.name : null,
    export_to_101evler: payload.exportTo101evler ?? false,
    ext_101evler: payload.ext101evler ?? {},
    export_to_hangiev: payload.exportToHangiev ?? false,
    ext_hangiev: payload.extHangiev ?? {},
    // 101evler & Hangiev: yeni FK kolonları (lookup-driven)
    type_id_101: payload.ext101evler?.type_id ?? null,
    area_id_101: payload.ext101evler?.area_id ?? null,
    title_type_id_101: payload.ext101evler?.title_type_id ?? null,
    room_count_id_101: payload.ext101evler?.room_count_id ?? null,
    build_age_id_101: payload.ext101evler?.build_age_id ?? null,
    furnishing_id_101: payload.ext101evler?.furnishing_id ?? null,
    billing_cycle_id_101: payload.ext101evler?.billing_cycle_id ?? null,
    price_for_101: (payload.ext101evler?.price_for as string | null | undefined) ?? null,
    reference_no_101: payload.ext101evler?.reference_no ?? null,
    property_type_id_hg: payload.extHangiev?.property_type_id ?? null,
    area_id_hg: payload.extHangiev?.area_id ?? null,
    room_count_id_hg: payload.extHangiev?.room_count_id ?? null,
    build_age_id_hg: payload.extHangiev?.build_age_id ?? null,
    furnishing_id_hg: payload.extHangiev?.furnishing_id ?? null,
    price_for_hg: (payload.extHangiev?.price_for as string | null | undefined) ?? null,
    reference_no_hg: payload.extHangiev?.reference_no ?? null,
    updated_at: now,
  };

  if (payload.id || payload.originalListingId) {
    const listingDbId = existingListing?.id ?? payload.id;
    if (!listingDbId) {
      throw new Error("Güncellenecek ilan bulunamadı.");
    }

    // Update existing listing
    const { error } = await updateListingWithCompat(listingDbId, data);
    
    if (error) {
      console.error("[saveListing] Update error:", error);
      throw new Error(`İlan güncellenemedi: ${error.message}`);
    }

    // Delete old images
    const { error: deleteImgError } = await supabaseAdmin
      .from("listing_images")
      .delete()
      .eq("listing_id", listingDbId);

    if (deleteImgError) {
      console.error("[saveListing] Delete images error:", deleteImgError);
    }

    // Insert new images
    if (gallery.length > 0) {
      const images = gallery.map(g => ({
        listing_id: listingDbId,
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

    if (user.role === "CONSULTANT" && requestedStatus === "PUBLISHED") {
      await notifyAdminForApproval({
        actorName: user.name ?? "Danisman",
        listingId: payload.listingId,
        title: payload.title,
        isUpdate: true,
      });
    }
  } else {
    // Create new listing
    const { data: newListing, error } = await insertListingWithCompat(data);
    
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

    if (user.role === "CONSULTANT" && requestedStatus === "PUBLISHED") {
      await notifyAdminForApproval({
        actorName: user.name ?? "Danisman",
        listingId: payload.listingId,
        title: payload.title,
        isUpdate: false,
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/ilanlar");
  revalidatePath(`/ilan/${payload.listingId}`);
  revalidatePath("/karealfaadmin/dashboard");
  revalidatePath("/karealfaadmin/ilanlar");
  revalidatePath("/karealfaadmin/onay-bekleyen");
  return { ok: true as const, status: finalStatus };
}

export async function reviewListing(id: string, decision: "approve" | "reject") {
  const user = await requireAdmin();
  const now = new Date().toISOString();

  const status = decision === "approve" ? "PUBLISHED" : "REJECTED";
  const { error } = await updateListingWithCompat(id, {
    publish_status: status,
    approval_submitted_at: null,
    approved_at: decision === "approve" ? now : null,
    approved_by_name: decision === "approve" ? user.name : null,
    rejected_at: decision === "reject" ? now : null,
    rejected_by_name: decision === "reject" ? user.name : null,
    updated_at: now,
  });

  if (error) {
    throw new Error(`İlan değerlendirmesi başarısız oldu: ${error.message}`);
  }

  const { data } = await supabaseAdmin.from("listings").select("listing_id").eq("id", id).single();

  revalidatePath("/");
  revalidatePath("/ilanlar");
  revalidatePath("/karealfaadmin/dashboard");
  revalidatePath("/karealfaadmin/ilanlar");
  revalidatePath("/karealfaadmin/onay-bekleyen");
  if (data?.listing_id) {
    revalidatePath(`/ilan/${data.listing_id}`);
  }

  return { ok: true as const, status };
}

export async function deleteListing(id: string) {
  await requireAdmin();
  
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
  await requirePanelUser();
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
  await requireAdmin();

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
  const translations: Record<
    string,
    {
      siteName: string | null;
      address: string | null;
      heroTitle: string | null;
      heroSubtitle: string | null;
      footerAbout: string | null;
      seoTitle: string | null;
      seoDescription: string | null;
    }
  > = {};

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

  const ext101FirstRaw = String(formData.get("ext101_first_realtor_id") ?? "").trim();
  const ext101SecondRaw = String(formData.get("ext101_second_realtor_id") ?? "").trim();
  const ext101 = {
    first_realtor_id: ext101FirstRaw ? Number(ext101FirstRaw) : null,
    second_realtor_id: ext101SecondRaw ? Number(ext101SecondRaw) : null,
  };

  const extHangievPortalRaw = String(formData.get("exthangiev_portal_id") ?? "").trim();
  const extHangievAgentRaw = String(formData.get("exthangiev_agent_id") ?? "").trim();
  const extHangievOfficeRaw = String(formData.get("exthangiev_office_id") ?? "").trim();
  const extHangiev = {
    portal_id: extHangievPortalRaw || null,
    agent_id: extHangievAgentRaw || null,
    office_id: extHangievOfficeRaw || null,
  };

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
    ext_101evler: ext101,
    ext_hangiev: extHangiev,
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
  await requireAdmin();
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
  await requireAdmin();

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
