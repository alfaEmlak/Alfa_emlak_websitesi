"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/panel-auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUSES = ["NEW", "REVIEWING", "INTERVIEW", "HIRED", "REJECTED"] as const;
type CareerStatus = (typeof STATUSES)[number];

export type CareerApplicationPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message?: string;
  cvUrl?: string;
  cvPath?: string;
  cvFilename?: string;
};

export async function submitCareerApplication(data: CareerApplicationPayload) {
  const firstName = data.firstName?.trim() ?? "";
  const lastName = data.lastName?.trim() ?? "";
  const email = data.email?.trim() ?? "";
  const phone = data.phone?.trim() ?? "";

  if (!firstName || !lastName) {
    return { ok: false as const, error: "Ad ve soyad zorunlu." };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false as const, error: "Geçerli bir e-posta giriniz." };
  }
  if (!phone) {
    return { ok: false as const, error: "Telefon zorunlu." };
  }

  const { error } = await supabaseAdmin.from("career_applications").insert({
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    message: data.message?.trim() || null,
    cv_url: data.cvUrl?.trim() || null,
    cv_path: data.cvPath?.trim() || null,
    cv_filename: data.cvFilename?.trim() || null,
  });

  if (error) {
    return { ok: false as const, error: `Başvuru kaydedilemedi: ${error.message}` };
  }

  revalidatePath("/karealfaadmin/kariyer");
  return { ok: true as const };
}

export async function markCareerRead(id: string) {
  await requireAdmin();
  const { error } = await supabaseAdmin
    .from("career_applications")
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Mark read failed: ${error.message}`);
  revalidatePath("/karealfaadmin/kariyer");
  return { ok: true as const };
}

export async function deleteCareerApplication(id: string) {
  await requireAdmin();
  const { error } = await supabaseAdmin.from("career_applications").delete().eq("id", id);
  if (error) throw new Error(`Delete failed: ${error.message}`);
  revalidatePath("/karealfaadmin/kariyer");
  return { ok: true as const };
}

export async function updateCareerStatus(id: string, status: string, notes?: string) {
  await requireAdmin();
  if (!STATUSES.includes(status as CareerStatus)) {
    throw new Error("Geçersiz durum.");
  }
  const payload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (notes !== undefined) payload.notes = notes.trim() || null;

  const { error } = await supabaseAdmin
    .from("career_applications")
    .update(payload)
    .eq("id", id);
  if (error) throw new Error(`Update failed: ${error.message}`);
  revalidatePath("/karealfaadmin/kariyer");
  return { ok: true as const };
}
