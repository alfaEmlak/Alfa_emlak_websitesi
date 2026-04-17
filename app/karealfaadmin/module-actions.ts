"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/admin-auth";

/* ────────── Contact Messages ────────── */

export async function submitContactMessage(data: {
  name: string;
  email?: string;
  phone?: string;
  subject?: string;
  message: string;
  listingId?: string;
}) {
  const { error } = await supabaseAdmin
    .from("contact_messages")
    .insert({
      name: data.name.trim(),
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      subject: data.subject?.trim() || null,
      message: data.message.trim(),
      listing_id: data.listingId?.trim() || null,
    });
  
  if (error) throw new Error(`Message submit failed: ${error.message}`);
  
  return { ok: true as const };
}

export async function markMessageRead(id: string) {
  const session = await getAdminSession();
  if (!session.isAdmin) throw new Error("Yetkisiz");
  
  const { error } = await supabaseAdmin
    .from("contact_messages")
    .update({ is_read: true })
    .eq("id", id);
  
  if (error) throw new Error(`Mark read failed: ${error.message}`);
  
  revalidatePath("/karealfaadmin/mesajlar");
  return { ok: true as const };
}

export async function deleteMessage(id: string) {
  const session = await getAdminSession();
  if (!session.isAdmin) throw new Error("Yetkisiz");
  
  const { error } = await supabaseAdmin
    .from("contact_messages")
    .delete()
    .eq("id", id);
  
  if (error) throw new Error(`Delete failed: ${error.message}`);
  
  revalidatePath("/karealfaadmin/mesajlar");
  return { ok: true as const };
}

export async function updateMessageCrmData(id: string, data: { status?: string; notes?: string; agentId?: string }) {
  const session = await getAdminSession();
  if (!session.isAdmin) throw new Error("Yetkisiz");

  const updatePayload: Record<string, unknown> = {};
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.notes !== undefined) updatePayload.notes = data.notes;
  if (data.agentId !== undefined) updatePayload.agent_id = data.agentId;
  
  const { error } = await supabaseAdmin
    .from("contact_messages")
    .update(updatePayload)
    .eq("id", id);
    
  if (error) throw new Error(`Update CRM data failed: ${error.message}`);
  
  revalidatePath("/karealfaadmin/mesajlar");
  return { ok: true as const };
}

/* ────────── Blog Posts ────────── */

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
  const session = await getAdminSession();
  if (!session.isAdmin) throw new Error("Yetkisiz");

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
    const { error } = await supabaseAdmin
      .from("blog_posts")
      .update(payload)
      .eq("id", data.id);
    
    if (error) throw new Error(`Blog update failed: ${error.message}`);
  } else {
    const { error } = await supabaseAdmin
      .from("blog_posts")
      .insert(payload);
    
    if (error) throw new Error(`Blog create failed: ${error.message}`);
  }

  revalidatePath("/karealfaadmin/blog");
  revalidatePath("/blog");
  return { ok: true as const };
}

export async function deleteBlogPost(id: string) {
  const session = await getAdminSession();
  if (!session.isAdmin) throw new Error("Yetkisiz");
  
  const { error } = await supabaseAdmin
    .from("blog_posts")
    .delete()
    .eq("id", id);
  
  if (error) throw new Error(`Delete failed: ${error.message}`);
  
  revalidatePath("/karealfaadmin/blog");
  revalidatePath("/blog");
  return { ok: true as const };
}

/* ────────── Agent Management ────────── */

async function hashPassword(password: string): Promise<string> {
  // Simple hash for demo — in production use bcrypt
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "alfa_salt_2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function saveAgent(data: {
  id?: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  photo?: string;
  title?: string;
  role: string;
}) {
  const session = await getAdminSession();
  if (!session.isAdmin) throw new Error("Yetkisiz");

  if (data.id) {
    const updateData: Record<string, unknown> = {
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone?.trim() || null,
      photo: data.photo?.trim() || null,
      title: data.title?.trim() || "Emlak Danışmanı",
      role: data.role,
      updated_at: new Date().toISOString(),
    };
    if (data.password && data.password.length > 0) {
      updateData.password_hash = await hashPassword(data.password);
    }
    
    const { error } = await supabaseAdmin
      .from("agents")
      .update(updateData)
      .eq("id", data.id);
    
    if (error) throw new Error(`Agent update failed: ${error.message}`);
  } else {
    if (!data.password) throw new Error("Yeni danışman için şifre gerekli");
    
    const { error } = await supabaseAdmin
      .from("agents")
      .insert({
        name: data.name.trim(),
        email: data.email.trim(),
        password_hash: await hashPassword(data.password),
        phone: data.phone?.trim() || null,
        photo: data.photo?.trim() || null,
        title: data.title?.trim() || "Emlak Danışmanı",
        role: data.role,
      });
    
    if (error) throw new Error(`Agent create failed: ${error.message}`);
  }

  revalidatePath("/karealfaadmin/danismanlar");
  return { ok: true as const };
}

export async function deleteAgent(id: string) {
  const session = await getAdminSession();
  if (!session.isAdmin) throw new Error("Yetkisiz");
  
  const { error } = await supabaseAdmin
    .from("agents")
    .delete()
    .eq("id", id);
  
  if (error) throw new Error(`Delete failed: ${error.message}`);
  
  revalidatePath("/karealfaadmin/danismanlar");
  return { ok: true as const };
}
