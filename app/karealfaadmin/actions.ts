"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPanelSession, getPanelUser, requireAdmin, requirePanelUser, requireRole } from "@/lib/panel-auth";
import { issueLoginCode, verifyLoginCodeValue, recordLoginEvent } from "@/lib/login-code";
import { issuePasswordResetToken, consumePasswordResetToken } from "@/lib/password-reset";
import { sendLoginCodeEmail, sendPasswordResetEmail } from "@/lib/email";
import type { PanelRole } from "@/lib/session";
import { PANEL_LOCALE_COOKIE } from "@/lib/panel-locale";
import { getPanelTranslations } from "@/lib/panel-translations";
import { routing } from "@/i18n/routing";
import { defaultMegaMenu } from "@/lib/default-menu";
import { menuTopItemsSchema } from "@/lib/menu-schema";
import { hashPassword, verifyPassword } from "@/lib/password";
import { normalizeListingCitySlug } from "@/lib/listing-city";
import { countPublishedFeaturedExcluding, SHOWCASE_MAX_PUBLISHED_FEATURED } from "@/lib/showcase-featured";
import { isUuidString } from "@/lib/listing-identity";
import { parseTitleDeedOwnership } from "@/lib/title-deed-ownership";
import { loadFeedLookups } from "@/lib/feeds/lookups";
import { getRequestBaseUrl } from "@/lib/request-url";
import { customAlphabet } from "nanoid";

// Giriş yapabilen tüm DB hesap rolleri (yönetici yetkili danışman dahil).
const LOGIN_ROLES = ["CONSULTANT", "AGENT", "ADMIN"];
const LISTING_STATUSES = ["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "HIDDEN", "REJECTED"] as const;
type ListingStatus = (typeof LISTING_STATUSES)[number];
type ExistingListingForSave = {
  id: string;
  publish_status: string;
  created_by_agent_id: string | null;
  created_by_name: string | null;
  /** Önceki kayıtta vitrin / öne çıkan etiketi (limit kontrolü için). */
  badgeFeatured: boolean;
};

type ActiveConsultantAccount = {
  id: string;
  name: string;
  role: string;
  password_hash: string;
  is_active: boolean;
  must_change_password?: boolean;
};

async function findConsultantByEmail(email: string) {
  const { data, error } = await supabaseAdmin
    .from("agents")
    .select("id, name, role, password_hash, is_active, must_change_password")
    .eq("email", email)
    .in("role", LOGIN_ROLES)
    .maybeSingle();

  if (error) {
    throw new Error(`Danışman hesabı okunamadı: ${error.message}`);
  }

  return (data ?? null) as ActiveConsultantAccount | null;
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

function listingPayloadHasVisual(
  galleryRows: { url: string }[],
  coverImage: string | undefined | null,
): boolean {
  if (galleryRows.some((g) => g.url.trim())) return true;
  return Boolean(String(coverImage ?? "").trim());
}

async function getRequestMeta() {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;
  const userAgent = h.get("user-agent") || null;
  return { ip, userAgent };
}

/** 2FA olmadan oturumu doğrudan açar, giriş olayını kaydeder ve panele yönlendirir. */
async function completePanelLogin(input: {
  role: PanelRole;
  email: string;
  name: string;
  agentId?: string;
  mustChangePassword?: boolean;
}) {
  const session = await getPanelSession();
  session.role = input.role;
  session.isAdmin = input.role === "ADMIN";
  session.agentId = input.agentId;
  session.name = input.name;
  // DB hesabı (agentId var) ise geçici şifre değişim zorunluluğu geçerli; env super-admin için değil.
  session.mustChangePassword = input.agentId ? input.mustChangePassword ?? false : false;
  session.pending = undefined;
  await syncPanelLocaleCookieToSession(session);
  await session.save();

  const meta = await getRequestMeta();
  await recordLoginEvent({
    agentId: input.agentId ?? null,
    actorName: input.name,
    role: input.role,
    email: input.email,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  if (session.mustChangePassword) {
    redirect("/karealfaadmin/sifre-degistir");
  }
  redirect("/karealfaadmin/dashboard");
}

/** Kimlik doğrulaması başarılı → 2FA kodu üretir, mail atar, yarı-oturum (pending) kurar. */
async function startTwoFactor(input: {
  role: PanelRole;
  email: string;
  name: string;
  agentId?: string;
  mustChangePassword?: boolean;
}) {
  const session = await getPanelSession();
  const code = await issueLoginCode({ email: input.email, role: input.role, agentId: input.agentId ?? null });

  const mail = await sendLoginCodeEmail(input.email, input.name, code);
  if (!mail.ok) {
    console.error("[loginAdmin] kod e-postası gönderilemedi:", mail.error);
    redirect("/karealfaadmin?e=mail");
  }

  session.role = undefined;
  session.isAdmin = undefined;
  session.agentId = undefined;
  session.mustChangePassword = undefined;
  session.pending = {
    role: input.role,
    agentId: input.agentId,
    name: input.name,
    email: input.email,
    mustChangePassword: input.mustChangePassword,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  await session.save();
  redirect("/karealfaadmin/dogrulama");
}

export async function loginAdmin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const expectedAdminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const expectedAdminPassword = process.env.ADMIN_PASSWORD ?? "";

  if (expectedAdminEmail && expectedAdminPassword && email === expectedAdminEmail && password === expectedAdminPassword) {
    // Env süper-admin: 2FA olmadan doğrudan giriş (danışman/DB hesapları 2FA'ya devam eder).
    await completePanelLogin({ role: "ADMIN", email: expectedAdminEmail, name: "Admin" });
  }

  const consultant = email ? await findConsultantByEmail(email) : null;

  if (!consultant) {
    redirect("/karealfaadmin?e=1");
  }

  if (!consultant.is_active) {
    redirect("/karealfaadmin?e=pending");
  }

  if (!verifyPassword(password, consultant.password_hash)) {
    redirect("/karealfaadmin?e=1");
  }

  // DB rolü ADMIN ise tam yönetici yetkisiyle, değilse danışman olarak gir.
  const sessionRole: PanelRole = consultant.role === "ADMIN" ? "ADMIN" : "CONSULTANT";

  await startTwoFactor({
    role: sessionRole,
    email,
    name: consultant.name,
    agentId: consultant.id,
    mustChangePassword: consultant.must_change_password ?? false,
  });
}

/** /karealfaadmin/dogrulama — e-posta kodunu doğrular, oturumu açar, giriş olayını kaydeder. */
export async function verifyLoginCode(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  const session = await getPanelSession();
  const pending = session.pending;

  if (!pending || pending.expiresAt < Date.now()) {
    session.pending = undefined;
    await session.save();
    redirect("/karealfaadmin?e=expired");
  }

  if (!/^\d{6}$/.test(code)) {
    redirect("/karealfaadmin/dogrulama?e=1");
  }

  const ok = await verifyLoginCodeValue(pending.email, code);
  if (!ok) {
    redirect("/karealfaadmin/dogrulama?e=1");
  }

  session.role = pending.role;
  session.isAdmin = pending.role === "ADMIN";
  session.agentId = pending.agentId;
  session.name = pending.name;
  // DB hesabı (agentId var) ise geçici şifre değişim zorunluluğu geçerli; env super-admin için değil.
  session.mustChangePassword = pending.agentId ? pending.mustChangePassword ?? false : false;
  session.pending = undefined;
  await syncPanelLocaleCookieToSession(session);
  await session.save();

  const meta = await getRequestMeta();
  await recordLoginEvent({
    agentId: pending.agentId ?? null,
    actorName: pending.name,
    role: pending.role,
    email: pending.email,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  if (session.mustChangePassword) {
    redirect("/karealfaadmin/sifre-degistir");
  }
  redirect("/karealfaadmin/dashboard");
}

/** Bekleyen giriş için yeni kod gönderir. */
export async function resendLoginCode() {
  const session = await getPanelSession();
  const pending = session.pending;
  if (!pending) {
    redirect("/karealfaadmin?e=expired");
  }

  const code = await issueLoginCode({ email: pending.email, role: pending.role, agentId: pending.agentId ?? null });
  const mail = await sendLoginCodeEmail(pending.email, pending.name ?? "", code);
  if (!mail.ok) {
    redirect("/karealfaadmin/dogrulama?e=mail");
  }

  pending.expiresAt = Date.now() + 10 * 60 * 1000;
  session.pending = pending;
  await session.save();
  redirect("/karealfaadmin/dogrulama?sent=1");
}

/** Zorunlu/opsiyonel şifre değişimi (danışman kendi şifresini belirler). */
export async function changeMyPassword(formData: FormData) {
  const user = await getPanelUser();
  if (!user || !user.agentId) {
    redirect("/karealfaadmin");
  }

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 6) {
    redirect("/karealfaadmin/sifre-degistir?e=short");
  }
  if (password !== confirm) {
    redirect("/karealfaadmin/sifre-degistir?e=mismatch");
  }

  const { error } = await supabaseAdmin
    .from("agents")
    .update({
      password_hash: hashPassword(password),
      must_change_password: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.agentId);

  if (error) {
    throw new Error(`Şifre güncellenemedi: ${error.message}`);
  }

  const session = await getPanelSession();
  session.mustChangePassword = false;
  await session.save();

  revalidatePath("/karealfaadmin", "layout");
  redirect("/karealfaadmin/dashboard");
}

async function syncPanelLocaleCookieToSession(session: Awaited<ReturnType<typeof getPanelSession>>) {
  const jar = await cookies();
  const c = jar.get(PANEL_LOCALE_COOKIE)?.value;
  if (c && routing.locales.includes(c as (typeof routing.locales)[number])) {
    session.panelLocale = c;
  }
}

export async function setPanelLocale(locale: string) {
  const loc = String(locale ?? "").trim();
  if (!loc || !routing.locales.includes(loc as (typeof routing.locales)[number])) {
    return { ok: false as const };
  }

  const jar = await cookies();
  jar.set(PANEL_LOCALE_COOKIE, loc, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });

  try {
    const session = await getPanelSession();
    if (session.role) {
      session.panelLocale = loc;
      await session.save();
    }
  } catch {
    /* oturum yok (giriş öncesi) — sadece çerez yeterli */
  }

  revalidatePath("/karealfaadmin", "layout");
  return { ok: true as const };
}

export async function registerConsultant(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password || password.length < 6) {
    redirect("/karealfaadmin?e=register");
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("agents")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Danışman e-posta kontrolü başarısız: ${existingError.message}`);
  }

  if (existing) {
    redirect("/karealfaadmin?e=exists");
  }

  const { error } = await supabaseAdmin.from("agents").insert({
    name,
    email,
    password_hash: hashPassword(password),
    phone: phone || null,
    title: "Emlak Danışmanı",
    role: "AGENT",
    is_active: false,
  });

  if (error) {
    throw new Error(`Danışman kaydı oluşturulamadı: ${error.message}`);
  }

  revalidatePath("/karealfaadmin/danismanlar");
  redirect("/karealfaadmin?registered=1");
}

/** "Şifremi unuttum" — e-postaya sıfırlama linki gönderir (hesap olsun olmasın aynı mesaj). */
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (email) {
    try {
      const issued = await issuePasswordResetToken(email);
      if (issued) {
        const base = await getRequestBaseUrl();
        const resetUrl = `${base}/karealfaadmin/sifre-belirle?token=${issued.token}`;
        const mail = await sendPasswordResetEmail(issued.email, issued.name, resetUrl);
        if (!mail.ok) {
          console.error("[requestPasswordReset] mail gönderilemedi:", mail.error);
        }
      }
    } catch (e) {
      console.error("[requestPasswordReset]", e);
    }
  }

  // Güvenlik: hesabın var olup olmadığını sızdırmamak için her durumda aynı sonuç.
  redirect("/karealfaadmin/sifre-sifirla?sent=1");
}

/** Token ile yeni şifre belirler. */
export async function resetPasswordWithToken(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) {
    redirect("/karealfaadmin/sifre-belirle?e=invalid");
  }
  if (password.length < 6) {
    redirect(`/karealfaadmin/sifre-belirle?token=${encodeURIComponent(token)}&e=short`);
  }
  if (password !== confirm) {
    redirect(`/karealfaadmin/sifre-belirle?token=${encodeURIComponent(token)}&e=mismatch`);
  }

  const agentId = await consumePasswordResetToken(token);
  if (!agentId) {
    redirect("/karealfaadmin/sifre-belirle?e=invalid");
  }

  const { error } = await supabaseAdmin
    .from("agents")
    .update({
      password_hash: hashPassword(password),
      must_change_password: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentId);

  if (error) {
    throw new Error(`Şifre güncellenemedi: ${error.message}`);
  }

  redirect("/karealfaadmin?reset=1");
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
  toilets: string;
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
  hasElevator: boolean;
  hasBalcony: boolean;
  hasTerrace: boolean;
  hasAirConditioning: boolean;
  hasGatedCommunity: boolean;
  /** Boş veya geçerli tapu mülkiyeti anahtarı (lib/title-deed-ownership) */
  titleDeedOwnership: string;
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
  /** Admin ilan oluştururken/güncellerken kayıtlı danışman seçimi (UUID) */
  selectedAgentId?: string;
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

async function getListingOfficeDefaults(): Promise<{ office: string; logo: string }> {
  try {
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("default_consultant_json")
      .eq("id", 1)
      .maybeSingle();
    const parsed =
      typeof data?.default_consultant_json === "string" && data.default_consultant_json.trim()
        ? JSON.parse(data.default_consultant_json) as { office?: string; logo?: string }
        : {};
    return {
      office: parsed.office?.trim() || "ALFA EMLAK",
      logo: parsed.logo?.trim() || "/alfa-3d.png",
    };
  } catch {
    return { office: "ALFA EMLAK", logo: "/alfa-3d.png" };
  }
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
  const richSelect = "id, publish_status, created_by_agent_id, created_by_name, badges";
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
      let badgeFeatured = false;
      try {
        const raw = row.badges;
        const o = typeof raw === "string" ? JSON.parse(raw) : raw;
        badgeFeatured = !!(o && typeof o === "object" && (o as { featured?: boolean }).featured);
      } catch {
        badgeFeatured = false;
      }
      return {
        data: {
          id: String(row.id ?? ""),
          publish_status: String(row.publish_status ?? ""),
          created_by_agent_id:
            typeof row.created_by_agent_id === "string" ? row.created_by_agent_id : null,
          created_by_name:
            typeof row.created_by_name === "string" ? row.created_by_name : null,
          badgeFeatured,
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
  const tp = await getPanelTranslations();
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
  const hasListingVisual = listingPayloadHasVisual(gallery, payload.coverImage);
  if (
    (finalStatus === "PUBLISHED" || finalStatus === "PENDING_APPROVAL") &&
    !hasListingVisual
  ) {
    throw new Error(tp("errors.saveNeedPhoto"));
  }

  if (user.role === "ADMIN" && (finalStatus === "PUBLISHED" || finalStatus === "PENDING_APPROVAL")) {
    const { count: activeAgentCount } = await supabaseAdmin
      .from("agents")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);
    if ((activeAgentCount ?? 0) > 0 && !String(payload.selectedAgentId ?? "").trim()) {
      throw new Error(tp("errors.saveNeedConsultant"));
    }
  }
  const now = new Date().toISOString();

  let existingListing: ExistingListingForSave | null = null;
  const officeDefaults = await getListingOfficeDefaults();
  let effectiveConsultant = {
    name: payload.consultantName?.trim() || null as string | null,
    phone: payload.consultantPhone?.trim() || null as string | null,
    email: payload.consultantEmail?.trim() || null as string | null,
    photo: payload.consultantPhoto?.trim() || null as string | null,
  };

  if (user.role === "CONSULTANT" && user.agentId) {
    const { data: me } = await supabaseAdmin
      .from("agents")
      .select("name, phone, email, photo")
      .eq("id", user.agentId)
      .maybeSingle();
    if (me) {
      effectiveConsultant = {
        name: typeof me.name === "string" ? me.name : effectiveConsultant.name,
        phone: typeof me.phone === "string" ? me.phone : null,
        email: typeof me.email === "string" ? me.email : effectiveConsultant.email,
        photo: typeof me.photo === "string" ? me.photo : null,
      };
    }
  }

  if (payload.id || payload.originalListingId) {
    const { data, error } = await findExistingListingForSave(payload);

    if (!data) {
      if (error) {
        console.error("[saveListing] findExistingListingForSave error:", error);
        throw new Error(tp("errors.listingNotFoundDetail", { detail: error.message }));
      }
      throw new Error(tp("errors.listingNotFound"));
    }

    existingListing = data;

    if (user.role === "CONSULTANT") {
      if (!user.agentId) {
        throw new Error(tp("errors.consultantNotConfigured"));
      }
      if (existingListing.created_by_agent_id !== user.agentId) {
        throw new Error(tp("errors.noEditPermission"));
      }
    }
  }

  const effectiveFeatured =
    user.role === "ADMIN" ? payload.badgeFeatured : (existingListing?.badgeFeatured ?? false);

  if (effectiveFeatured && finalStatus === "PUBLISHED") {
    const wasFeatured = existingListing?.badgeFeatured ?? false;
    const others = await countPublishedFeaturedExcluding(existingListing?.id ?? null);
    if (!wasFeatured && others >= SHOWCASE_MAX_PUBLISHED_FEATURED) {
      throw new Error(tp("errors.featuredLimit"));
    }
  }

  // 101evler/Hangiev FK kolonları (type_id_101, area_id_101, ...) lookup
  // tablolarına foreign key ile bağlı. İçe aktarılan ilanların ext JSON'unda,
  // lookup tablolarında karşılığı OLMAYAN ham id'ler bulunabiliyor; bunları
  // doğrudan FK kolonuna yazmak FK ihlaline (kayıt hatası) yol açar. Bu yüzden
  // her id'yi lookup setine karşı doğrulayıp, yoksa null yazıyoruz. Ham değer
  // ext_*evler JSON'unda korunduğu için re-export bilgisi kaybolmaz.
  const lookups = await loadFeedLookups();
  const idSet = (opts: { id: number }[]) => new Set(opts.map((o) => o.id));
  const valid101 = {
    types: idSet(lookups.ext101.types),
    areas: idSet(lookups.ext101.areas),
    titleTypes: idSet(lookups.ext101.titleTypes),
    roomCounts: idSet(lookups.ext101.roomCounts),
    buildAges: idSet(lookups.ext101.buildAges),
    furnishing: idSet(lookups.ext101.furnishing),
    billingCycles: idSet(lookups.ext101.billingCycles),
  };
  const validHg = {
    propertyTypes: idSet(lookups.hangiev.propertyTypes),
    areas: idSet(lookups.hangiev.areas),
    roomCounts: idSet(lookups.hangiev.roomCounts),
    buildAges: idSet(lookups.hangiev.buildAges),
    furnishing: idSet(lookups.hangiev.furnishing),
  };
  const fkOrNull = (id: unknown, valid: Set<number>): number | null => {
    const n = typeof id === "number" ? id : Number(id);
    return Number.isFinite(n) && valid.has(n) ? n : null;
  };

  const data = {
    listing_id: payload.listingId?.trim() || "",
    title: payload.title?.trim() || "",
    kind: payload.kind,
    property_type: payload.propertyType?.trim() || "",
    city: normalizeListingCitySlug(payload.city?.trim() || ""),
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
    toilets: intOrNull(payload.toilets),
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
    has_elevator: payload.hasElevator,
    has_balcony: payload.hasBalcony,
    has_terrace: payload.hasTerrace,
    has_air_conditioning: payload.hasAirConditioning,
    has_gated_community: payload.hasGatedCommunity,
    title_deed_ownership: parseTitleDeedOwnership(payload.titleDeedOwnership) || null,
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
      featured: effectiveFeatured,
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
    consultant_name: effectiveConsultant.name,
    consultant_phone: effectiveConsultant.phone,
    consultant_whatsapp: payload.consultantWhatsapp?.trim() || null,
    consultant_email: effectiveConsultant.email,
    consultant_office: officeDefaults.office,
    consultant_photo: effectiveConsultant.photo,
    consultant_office_logo: officeDefaults.logo,
    translations: payload.translations?.trim() || null,
    created_by_agent_id:
      user.role === "CONSULTANT"
        ? user.agentId ?? existingListing?.created_by_agent_id ?? null
        : String(payload.selectedAgentId ?? "").trim()
          ? String(payload.selectedAgentId).trim()
          : existingListing?.created_by_agent_id ?? null,
    created_by_name:
      user.role === "CONSULTANT"
        ? user.name ?? existingListing?.created_by_name ?? "Danışman"
        : String(payload.selectedAgentId ?? "").trim()
          ? payload.consultantName?.trim() || existingListing?.created_by_name || "Admin"
          : existingListing?.created_by_name ?? "Admin",
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
    type_id_101: fkOrNull(payload.ext101evler?.type_id, valid101.types),
    area_id_101: fkOrNull(payload.ext101evler?.area_id, valid101.areas),
    title_type_id_101: fkOrNull(payload.ext101evler?.title_type_id, valid101.titleTypes),
    room_count_id_101: fkOrNull(payload.ext101evler?.room_count_id, valid101.roomCounts),
    build_age_id_101: fkOrNull(payload.ext101evler?.build_age_id, valid101.buildAges),
    furnishing_id_101: fkOrNull(payload.ext101evler?.furnishing_id, valid101.furnishing),
    // billing_cycle_id sadece kiralık ilanlarda (KIRALIK / GUNLUK_KIRALIK) geçerlidir.
    // Satılık / Proje için null olmalı; ayrıca lookup'ta yoksa yine null (FK ihlali olmasın).
    billing_cycle_id_101: (payload.kind === "KIRALIK" || payload.kind === "GUNLUK_KIRALIK")
      ? fkOrNull(payload.ext101evler?.billing_cycle_id, valid101.billingCycles)
      : null,
    price_for_101: (payload.ext101evler?.price_for as string | null | undefined) ?? null,
    reference_no_101: payload.ext101evler?.reference_no ?? null,
    property_type_id_hg: fkOrNull(payload.extHangiev?.property_type_id, validHg.propertyTypes),
    area_id_hg: fkOrNull(payload.extHangiev?.area_id, validHg.areas),
    room_count_id_hg: fkOrNull(payload.extHangiev?.room_count_id, validHg.roomCounts),
    build_age_id_hg: fkOrNull(payload.extHangiev?.build_age_id, validHg.buildAges),
    furnishing_id_hg: fkOrNull(payload.extHangiev?.furnishing_id, validHg.furnishing),
    price_for_hg: (payload.extHangiev?.price_for as string | null | undefined) ?? null,
    reference_no_hg: payload.extHangiev?.reference_no ?? null,
    updated_at: now,
  };

  if (payload.id || payload.originalListingId) {
    const listingDbId = existingListing?.id ?? payload.id;
    if (!listingDbId) {
      throw new Error(tp("errors.listingUpdateMissing"));
    }

    // Update existing listing
    const { error } = await updateListingWithCompat(listingDbId, data);
    
    if (error) {
      console.error("[saveListing] Update error:", error);
      throw new Error(tp("errors.listingUpdateFailed", { detail: error.message }));
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
        throw new Error(tp("errors.photosAddFailed", { detail: imgError.message }));
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
        throw new Error("LISTING_DUPLICATE");
      }
      throw new Error(tp("errors.listingCreateFailed", { detail: error.message }));
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
        throw new Error(tp("errors.photosAddFailed", { detail: imgError.message }));
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
  for (const loc of routing.locales) {
    revalidatePath(`/${loc}`);
    revalidatePath(`/${loc}/ilanlar`);
    if (payload.listingId) {
      revalidatePath(`/${loc}/ilan/${payload.listingId}`);
    }
  }
  revalidatePath("/karealfaadmin/dashboard");
  revalidatePath("/karealfaadmin/ilanlar");
  revalidatePath("/karealfaadmin/onay-bekleyen");
  return { ok: true as const, status: finalStatus };
}

async function resolveListingRowId(idOrPublicId: string): Promise<string | null> {
  const t = String(idOrPublicId ?? "").trim();
  if (!t) return null;
  if (isUuidString(t)) {
    const { data } = await supabaseAdmin.from("listings").select("id").eq("id", t).maybeSingle();
    if (data?.id) return String(data.id);
  }
  const { data: byPublic } = await supabaseAdmin.from("listings").select("id").eq("listing_id", t).maybeSingle();
  return byPublic?.id ? String(byPublic.id) : null;
}

/** DB'de REJECTED check'te yoksa veya reddetme başka nedenle patlarsa: HIDDEN + jsonb işareti. */
async function rejectListingAsHiddenWithFlag(
  rowId: string,
  userName: string | null,
  now: string,
): Promise<{ error: { message: string; code?: string } | null }> {
  const { data: row } = await supabaseAdmin.from("listings").select("detail_fields").eq("id", rowId).maybeSingle();
  let detail: Record<string, unknown> = {};
  const raw = row?.detail_fields as unknown;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    detail = { ...(raw as Record<string, unknown>) };
  } else if (typeof raw === "string" && raw.trim()) {
    try {
      detail = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      detail = {};
    }
  }
  detail.adminReject = true;
  detail.rejectedAt = now;
  detail.rejectedByName = userName ?? "";

  return updateListingWithCompat(rowId, {
    publish_status: "HIDDEN",
    detail_fields: detail,
    updated_at: now,
    rejected_at: now,
    rejected_by_name: userName ?? null,
    approval_submitted_at: null,
    approved_at: null,
    approved_by_name: null,
  });
}

export async function reviewListing(id: string, decision: "approve" | "reject") {
  const user = await requireAdmin();
  const now = new Date().toISOString();

  const status = decision === "approve" ? "PUBLISHED" : "REJECTED";

  const rowId = await resolveListingRowId(id);
  if (!rowId) {
    console.error("[reviewListing] ilan bulunamadı:", id);
    redirect("/karealfaadmin/onay-bekleyen?review=fail");
  }

  if (decision === "approve") {
    const { data: listingRow } = await supabaseAdmin
      .from("listings")
      .select("cover_image")
      .eq("id", rowId)
      .maybeSingle();
    const coverOk = Boolean(String(listingRow?.cover_image ?? "").trim());
    const { count: imageCount, error: countErr } = await supabaseAdmin
      .from("listing_images")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", rowId);
    if (countErr) {
      console.error("[reviewListing] listing_images count:", countErr);
    }
    const n = typeof imageCount === "number" ? imageCount : 0;
    if (n === 0 && !coverOk) {
      redirect("/karealfaadmin/onay-bekleyen?review=nophoto");
    }
  }

  let error = (
    await supabaseAdmin.from("listings").update({ publish_status: status, updated_at: now }).eq("id", rowId)
  ).error;
  if (error) {
    error = (await supabaseAdmin.from("listings").update({ publish_status: status }).eq("id", rowId)).error;
  }

  let rejectUsedHiddenFallback = false;
  if (error && decision === "reject") {
    const fb = await rejectListingAsHiddenWithFlag(rowId, user.name ?? null, now);
    if (!fb.error) {
      error = null;
      rejectUsedHiddenFallback = true;
    }
  }

  if (!error && !rejectUsedHiddenFallback) {
    const meta: Record<string, unknown> = {
      approval_submitted_at: null,
      updated_at: now,
      approved_at: decision === "approve" ? now : null,
      approved_by_name: decision === "approve" ? user.name : null,
      rejected_at: decision === "reject" ? now : null,
      rejected_by_name: decision === "reject" ? user.name : null,
    };
    const metaResult = await updateListingWithCompat(rowId, meta);
    if (metaResult.error) {
      console.warn("[reviewListing] onay/red meta kolonları (isteğe bağlı):", metaResult.error);
    }
  }

  const { data } = await supabaseAdmin.from("listings").select("listing_id").eq("id", rowId).maybeSingle();

  revalidatePath("/");
  revalidatePath("/ilanlar");
  revalidatePath("/karealfaadmin/dashboard");
  revalidatePath("/karealfaadmin/ilanlar");
  revalidatePath("/karealfaadmin/onay-bekleyen");
  if (data?.listing_id) {
    revalidatePath(`/ilan/${data.listing_id}`);
  }

  if (error) {
    console.error("[reviewListing]", error);
    redirect("/karealfaadmin/onay-bekleyen?review=fail");
  }

  return { ok: true as const, status };
}

/**
 * İlan listesindeki dropdown'dan yayın durumunu değiştirir (Yayına al / Yayından kaldır).
 * Yönlendirme yapmaz; istemci sonucu alıp router.refresh() ile listeyi tazeler.
 */
export async function setListingPublishStatus(
  id: string,
  status: "DRAFT" | "PUBLISHED" | "HIDDEN" | "PENDING_APPROVAL" | "REJECTED",
): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  const user = await requirePanelUser();
  const allowed = ["DRAFT", "PUBLISHED", "HIDDEN", "PENDING_APPROVAL", "REJECTED"];
  if (!allowed.includes(status)) return { ok: false, error: "invalid" };

  const rowId = await resolveListingRowId(String(id ?? "").trim());
  if (!rowId) return { ok: false, error: "notfound" };

  const { data: row } = await supabaseAdmin
    .from("listings")
    .select("created_by_agent_id, listing_id")
    .eq("id", rowId)
    .maybeSingle();
  if (!row) return { ok: false, error: "notfound" };

  let nextStatus = status;
  if (user.role !== "ADMIN") {
    const ownerId = row.created_by_agent_id != null ? String(row.created_by_agent_id) : null;
    if (!user.agentId || ownerId !== user.agentId) return { ok: false, error: "forbidden" };
    // Danışmanlar doğrudan yayınlayamaz → onaya gönderilir.
    if (nextStatus === "PUBLISHED") nextStatus = "PENDING_APPROVAL";
  }

  const now = new Date().toISOString();
  const meta: Record<string, unknown> = { publish_status: nextStatus, updated_at: now };
  if (nextStatus === "PUBLISHED") {
    meta.approved_at = now;
    meta.approved_by_name = user.name ?? null;
  }

  const { error } = await updateListingWithCompat(rowId, meta);
  if (error) {
    const e2 = (await supabaseAdmin.from("listings").update({ publish_status: nextStatus }).eq("id", rowId)).error;
    if (e2) return { ok: false, error: e2.message };
  }

  const pub = row.listing_id != null ? String(row.listing_id) : "";
  revalidatePath("/");
  revalidatePath("/karealfaadmin/ilanlar");
  revalidatePath("/karealfaadmin/dashboard");
  revalidatePath("/karealfaadmin/onay-bekleyen");
  if (pub) {
    for (const loc of routing.locales) {
      revalidatePath(`/${loc}/ilan/${pub}`);
      revalidatePath(`/${loc}/ilanlar`);
    }
  }

  return { ok: true, status: nextStatus };
}

/**
 * Silme sonrası dönülecek adresi güvenli hâle getirir.
 *
 * returnTo istemciden geldiği için doğrudan redirect'e verilemez (açık
 * yönlendirme). Yalnızca ilan listesi yoluna izin verilir, sorgu dizesi
 * (aktif filtreler) korunur; ek olarak `delete` durum parametresi eklenir.
 */
function listingsRedirectUrl(returnTo: string | undefined, deleteStatus?: string): string {
  const base = "/karealfaadmin/ilanlar";
  let params = new URLSearchParams();

  if (returnTo) {
    // Sadece göreli yol kabul edilir; "//host" ve "http://…" reddedilir.
    const isRelative = returnTo.startsWith("/") && !returnTo.startsWith("//");
    if (isRelative) {
      const [path, query = ""] = returnTo.split("?");
      if (path === base) params = new URLSearchParams(query);
    }
  }

  if (deleteStatus) params.set("delete", deleteStatus);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export async function deleteListing(id: string, returnTo?: string) {
  const user = await requirePanelUser();
  const rowId = await resolveListingRowId(String(id ?? "").trim());
  if (!rowId) {
    redirect(listingsRedirectUrl(returnTo, "notfound"));
  }

  const { data: row, error: fetchErr } = await supabaseAdmin
    .from("listings")
    .select("created_by_agent_id, listing_id")
    .eq("id", rowId)
    .maybeSingle();

  if (fetchErr || !row) {
    console.error("[deleteListing] fetch:", fetchErr);
    redirect(listingsRedirectUrl(returnTo, "notfound"));
  }

  if (user.role !== "ADMIN") {
    const ownerId = row.created_by_agent_id != null ? String(row.created_by_agent_id) : null;
    if (!user.agentId || ownerId !== user.agentId) {
      redirect(listingsRedirectUrl(returnTo, "forbidden"));
    }
  }

  const publicListingId = row.listing_id != null ? String(row.listing_id) : "";

  const { error } = await supabaseAdmin.from("listings").delete().eq("id", rowId);

  if (error) {
    console.error("[deleteListing]", error);
    redirect(listingsRedirectUrl(returnTo, "error"));
  }

  revalidatePath("/");
  revalidatePath("/ilanlar");
  revalidatePath("/karealfaadmin/dashboard");
  revalidatePath("/karealfaadmin/ilanlar");
  revalidatePath("/karealfaadmin/onay-bekleyen");
  if (publicListingId) {
    revalidatePath(`/ilan/${publicListingId}`);
    for (const loc of routing.locales) {
      revalidatePath(`/${loc}/ilan/${publicListingId}`);
      revalidatePath(`/${loc}/ilanlar`);
    }
  }

  // Aktif filtrelerle aynı listeye dön (ör. danışman filtresi korunur).
  redirect(listingsRedirectUrl(returnTo));
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
    logo: String(formData.get("dc_logo") ?? "").trim() || "/alfa-3d.png",
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

  const analysisBars = String(formData.get("analysis_bars") ?? "")
    .split(/[,\s]+/)
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isFinite(n) && n >= 0);
  const analysis = {
    label: String(formData.get("analysis_label") ?? "").trim(),
    title: String(formData.get("analysis_title") ?? "").trim(),
    description: String(formData.get("analysis_description") ?? "").trim(),
    stat1Value: String(formData.get("analysis_stat1Value") ?? "").trim(),
    stat1Label: String(formData.get("analysis_stat1Label") ?? "").trim(),
    stat2Value: String(formData.get("analysis_stat2Value") ?? "").trim(),
    stat2Label: String(formData.get("analysis_stat2Label") ?? "").trim(),
    disclaimer: String(formData.get("analysis_disclaimer") ?? "").trim(),
    chartTitle: String(formData.get("analysis_chartTitle") ?? "").trim(),
    exampleBadge: String(formData.get("analysis_exampleBadge") ?? "").trim(),
    startYear: String(formData.get("analysis_startYear") ?? "").trim(),
    endYear: String(formData.get("analysis_endYear") ?? "").trim(),
    bars: analysisBars,
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
    analysis_json: JSON.stringify(analysis),
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

const AI_SYSTEM_PROMPT_MAX = 6000;

/** Alfi AI asistanı — admin'den düzenlenebilir persona/eğitim promptu + opsiyonel model. */
export async function saveAiTraining(formData: FormData) {
  await requireAdmin();

  const systemPrompt = String(formData.get("ai_system_prompt") ?? "").trim().slice(0, AI_SYSTEM_PROMPT_MAX);
  const model = String(formData.get("ai_model") ?? "").trim().slice(0, 120);

  const settingsData = {
    ai_system_prompt: systemPrompt || null,
    ai_model: model || null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabaseAdmin
    .from("site_settings")
    .select("id")
    .eq("id", 1)
    .single();

  if (existing) {
    const { error } = await supabaseAdmin.from("site_settings").update(settingsData).eq("id", 1);
    if (error) throw new Error(`AI ayarları kaydedilemedi: ${error.message}`);
  } else {
    const { error } = await supabaseAdmin.from("site_settings").insert({ id: 1, ...settingsData });
    if (error) throw new Error(`AI ayarları kaydedilemedi: ${error.message}`);
  }

  revalidatePath("/karealfaadmin/ai-egitimi");
}

export async function saveMyConsultantProfile(formData: FormData) {
  const user = await requireRole("CONSULTANT");
  const tp = await getPanelTranslations();
  if (!user.agentId) {
    throw new Error(tp("errors.consultantMissing"));
  }

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const photo = String(formData.get("photo") ?? "").trim();

  if (!name) {
    throw new Error(tp("errors.profileNameRequired"));
  }

  const { error } = await supabaseAdmin
    .from("agents")
    .update({
      name,
      phone: phone || null,
      whatsapp: whatsapp || null,
      photo: photo || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.agentId);

  if (error) {
    throw new Error(tp("errors.profileUpdateFailed", { detail: error.message }));
  }

  const session = await getPanelSession();
  session.name = name;
  await session.save();

  revalidatePath("/karealfaadmin/danisman-ayarlar");
  revalidatePath("/karealfaadmin/dashboard");
  revalidatePath("/karealfaadmin", "layout");
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
  const tp = await getPanelTranslations();

  if (featured) {
    const others = await countPublishedFeaturedExcluding(listingId);
    if (others >= SHOWCASE_MAX_PUBLISHED_FEATURED) {
      throw new Error(tp("errors.featuredLimit"));
    }
  }

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
