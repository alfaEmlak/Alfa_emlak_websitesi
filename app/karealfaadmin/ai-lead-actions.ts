"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { LeadStatus } from "@/lib/ai/types";

const ALLOWED: LeadStatus[] = ["new", "contacted", "in_progress", "closed", "rejected"];

export async function updateAiLeadStatus(id: string, status: LeadStatus) {
  await requireAdmin();
  if (!ALLOWED.includes(status)) throw new Error("Geçersiz durum.");

  const { error } = await supabaseAdmin
    .from("ai_customer_forms")
    .update({
      status,
      is_read: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(`Durum güncellenemedi: ${error.message}`);

  revalidatePath("/karealfaadmin/kullanici-formlari");
  revalidatePath(`/karealfaadmin/kullanici-formlari/${id}`);
  return { ok: true as const };
}
