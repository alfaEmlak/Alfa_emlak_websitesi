"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { customAlphabet } from "nanoid";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, requirePanelUser } from "@/lib/panel-auth";
import { hashPassword } from "@/lib/password";
import { sendTempPasswordEmail } from "@/lib/email";

async function assertContactMessageAccess(messageId: string) {
  const user = await requirePanelUser();
  if (user.role === "ADMIN") return user;

  const { data, error } = await supabaseAdmin
    .from("contact_messages")
    .select("agent_id")
    .eq("id", messageId)
    .maybeSingle();

  if (error || !data) redirect("/karealfaadmin/dashboard");

  const aid = typeof data.agent_id === "string" ? data.agent_id : null;
  if (user.role === "CONSULTANT" && user.agentId && aid === user.agentId) return user;

  redirect("/karealfaadmin/dashboard");
}

export type SubmitContactResult =
  | { ok: true }
  | { ok: false; error: "name_phone_required" };

export async function submitContactMessage(data: {
  name: string;
  email?: string;
  phone?: string;
  subject?: string;
  message: string;
  listingId?: string;
}): Promise<SubmitContactResult> {
  const name = data.name?.trim() ?? "";
  const message = data.message?.trim() ?? "";
  const phoneDigits = (data.phone ?? "").replace(/\D/g, "");
  if (name.length < 2 || phoneDigits.length < 7 || message.length < 1) {
    return { ok: false, error: "name_phone_required" };
  }

  const listingPublicId = data.listingId?.trim() || null;
  let agentId: string | null = null;
  if (listingPublicId) {
    const { data: listingRow } = await supabaseAdmin
      .from("listings")
      .select("created_by_agent_id")
      .eq("listing_id", listingPublicId)
      .maybeSingle();
    const raw = listingRow?.created_by_agent_id as string | null | undefined;
    agentId = typeof raw === "string" && raw ? raw : null;
  }

  const insertPayload: Record<string, unknown> = {
    name,
    email: data.email?.trim() || null,
    phone: data.phone?.trim() || null,
    subject: data.subject?.trim() || null,
    message,
    listing_id: listingPublicId,
  };
  if (agentId) {
    insertPayload.agent_id = agentId;
  }

  const { error } = await supabaseAdmin.from("contact_messages").insert(insertPayload as never);

  if (error) throw new Error(`Message submit failed: ${error.message}`);

  return { ok: true };
}

export async function markMessageRead(id: string) {
  await assertContactMessageAccess(id);

  const { error } = await supabaseAdmin.from("contact_messages").update({ is_read: true }).eq("id", id);

  if (error) throw new Error(`Mark read failed: ${error.message}`);

  revalidatePath("/karealfaadmin/mesajlar");
  return { ok: true as const };
}

export async function deleteMessage(id: string) {
  await assertContactMessageAccess(id);

  const { error } = await supabaseAdmin.from("contact_messages").delete().eq("id", id);

  if (error) throw new Error(`Delete failed: ${error.message}`);

  revalidatePath("/karealfaadmin/mesajlar");
  return { ok: true as const };
}

export async function updateMessageCrmData(id: string, data: { status?: string; notes?: string; agentId?: string }) {
  const user = await assertContactMessageAccess(id);

  const updatePayload: Record<string, unknown> = {};
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.notes !== undefined) updatePayload.notes = data.notes;
  if (data.agentId !== undefined && user.role === "ADMIN") updatePayload.agent_id = data.agentId;

  const { error } = await supabaseAdmin.from("contact_messages").update(updatePayload).eq("id", id);

  if (error) throw new Error(`Update CRM data failed: ${error.message}`);

  revalidatePath("/karealfaadmin/mesajlar");
  return { ok: true as const };
}

export async function saveBlogPost(data: {
  id?: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  authorName?: string;
  status: string;
  translations?: string;
}) {
  await requireAdmin();

  const payload = {
    title: data.title.trim(),
    slug: data.slug.trim().toLowerCase().replace(/\s+/g, "-"),
    excerpt: data.excerpt?.trim() || null,
    content: data.content,
    cover_image: data.coverImage?.trim() || null,
    author_name: data.authorName?.trim() || null,
    status: data.status,
    translations: data.translations?.trim() || null,
    published_at: data.status === "PUBLISHED" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  if (data.id) {
    const { error } = await supabaseAdmin.from("blog_posts").update(payload).eq("id", data.id);
    if (error) throw new Error(`Blog update failed: ${error.message}`);
  } else {
    const { error } = await supabaseAdmin.from("blog_posts").insert(payload);
    if (error) throw new Error(`Blog create failed: ${error.message}`);
  }

  revalidatePath("/karealfaadmin/blog");
  revalidatePath("/blog");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function deleteBlogPost(id: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin.from("blog_posts").delete().eq("id", id);

  if (error) throw new Error(`Delete failed: ${error.message}`);

  revalidatePath("/karealfaadmin/blog");
  revalidatePath("/blog");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function saveAgent(data: {
  id?: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  whatsapp?: string;
  photo?: string;
  title?: string;
  role: string;
  realtor_id_101?: number | null;
}) {
  await requireAdmin();

  // Supabase tablosunda check constraint historically "ADMIN | AGENT" olabilir (bkz. lib/supabase/client.ts).
  // UI'dan gelen legacy "CONSULTANT" değerini DB'nin beklediği AGENT olarak normalize et.
  const normalizedRole =
    data.role === "CONSULTANT" || data.role === "AGENT" ? "AGENT" : data.role;

  if (data.id) {
    const updateData: Record<string, unknown> = {
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone?.trim() || null,
      whatsapp: data.whatsapp?.trim() || null,
      photo: data.photo?.trim() || null,
      title: data.title?.trim() || "Emlak Danışmanı",
      role: normalizedRole,
      realtor_id_101: data.realtor_id_101 ?? null,
      updated_at: new Date().toISOString(),
    };

    if (data.password && data.password.length > 0) {
      updateData.password_hash = hashPassword(data.password);
    }

    const { error } = await supabaseAdmin.from("agents").update(updateData).eq("id", data.id);

    if (error) throw new Error(`Agent update failed: ${error.message}`);
  } else {
    if (!data.password) throw new Error("Yeni danışman için şifre gerekli");

    const { error } = await supabaseAdmin.from("agents").insert({
      name: data.name.trim(),
      email: data.email.trim(),
      password_hash: hashPassword(data.password),
      phone: data.phone?.trim() || null,
      whatsapp: data.whatsapp?.trim() || null,
      photo: data.photo?.trim() || null,
      title: data.title?.trim() || "Emlak Danışmanı",
      role: normalizedRole,
      realtor_id_101: data.realtor_id_101 ?? null,
    });

    if (error) throw new Error(`Agent create failed: ${error.message}`);
  }

  revalidatePath("/karealfaadmin/danismanlar");
  return { ok: true as const };
}

export async function deleteAgent(id: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin.from("agents").delete().eq("id", id);

  if (error) throw new Error(`Delete failed: ${error.message}`);

  revalidatePath("/karealfaadmin/danismanlar");
  return { ok: true as const };
}

export async function approveAgent(id: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin
    .from("agents")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(`Agent approve failed: ${error.message}`);

  revalidatePath("/karealfaadmin/danismanlar");
}

export async function rejectAgent(id: string) {
  await requireAdmin();

  const { error } = await supabaseAdmin.from("agents").delete().eq("id", id).eq("is_active", false);

  if (error) throw new Error(`Agent reject failed: ${error.message}`);

  revalidatePath("/karealfaadmin/danismanlar");
}

// Karışık olmayan karakterlerden okunabilir geçici şifre (0/O, 1/l/I hariç).
const tempPasswordAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const makeTempPassword = customAlphabet(tempPasswordAlphabet, 10);

export type TempPasswordResult =
  | { ok: true; password: string; emailed: boolean; emailError?: string }
  | { ok: false; error: string };

/**
 * Süper admin: bir danışman için geçici şifre üretir, hesabı aktifleştirir,
 * ilk girişte şifre değişimini zorunlu kılar ve geçici şifreyi mail atar.
 * Üretilen şifre ekranda da gösterilmek üzere döndürülür.
 */
export async function adminGenerateTempPassword(agentId: string): Promise<TempPasswordResult> {
  await requireAdmin();

  const { data: agent, error: readErr } = await supabaseAdmin
    .from("agents")
    .select("id, name, email")
    .eq("id", agentId)
    .maybeSingle();

  if (readErr || !agent) {
    return { ok: false, error: "Danışman bulunamadı." };
  }

  const tempPassword = makeTempPassword();

  const { error: updErr } = await supabaseAdmin
    .from("agents")
    .update({
      password_hash: hashPassword(tempPassword),
      must_change_password: true,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agentId);

  if (updErr) {
    return { ok: false, error: `Şifre kaydedilemedi: ${updErr.message}` };
  }

  const loginUrl = `${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}/karealfaadmin`;
  const email = typeof agent.email === "string" ? agent.email : "";
  const name = typeof agent.name === "string" ? agent.name : "";

  let emailed = false;
  let emailError: string | undefined;
  if (email) {
    const mail = await sendTempPasswordEmail(email, name, tempPassword, loginUrl);
    emailed = mail.ok;
    if (!mail.ok) emailError = mail.error;
  } else {
    emailError = "Danışmanın e-posta adresi yok.";
  }

  revalidatePath("/karealfaadmin/danismanlar");
  return { ok: true, password: tempPassword, emailed, emailError };
}

/** Danışman listeleme sırasını günceller (verilen id sırasına göre 0,1,2…). */
export async function reorderAgents(orderedIds: string[]) {
  await requireAdmin();

  const now = new Date().toISOString();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabaseAdmin
      .from("agents")
      .update({ sort_order: i, updated_at: now })
      .eq("id", orderedIds[i]);
    if (error) throw new Error(`Danışman sırası güncellenemedi: ${error.message}`);
  }

  revalidatePath("/karealfaadmin/danismanlar");
  revalidatePath("/danismanlar");
  revalidatePath("/", "layout");
}
