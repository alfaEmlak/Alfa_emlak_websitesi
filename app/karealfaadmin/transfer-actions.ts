"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * İlan aktarımı: bir danışmanın ilanlarını başka bir danışmana devreder.
 *
 * Sadece created_by_agent_id değiştirmek yetmez — feed'ler danışman bilgisini
 * ilanın kendi consultant_* kolonlarından okuyor (hangiev-builder.ts:445,
 * 101evler-builder.ts:202 first_realtor_id çözümü consultant_email üzerinden).
 * Bu yüzden ilan düzenleyicinin yazdığı alan setinin aynısı yazılır.
 */

export type TransferResult =
  | { ok: true; moved: number }
  | { ok: false; error: TransferError };

export type TransferError =
  | "same_agent"
  | "agent_not_found"
  | "no_listings"
  | "db_error";

type AgentContact = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  photo: string | null;
};

async function fetchAgent(id: string): Promise<AgentContact | null> {
  const { data } = await supabaseAdmin
    .from("agents")
    .select("id, name, phone, whatsapp, email, photo")
    .eq("id", id)
    .maybeSingle();

  if (!data || typeof data.name !== "string") return null;
  return {
    id: String(data.id),
    name: data.name,
    phone: typeof data.phone === "string" ? data.phone : null,
    whatsapp: typeof data.whatsapp === "string" ? data.whatsapp : null,
    email: typeof data.email === "string" ? data.email : null,
    photo: typeof data.photo === "string" ? data.photo : null,
  };
}

/**
 * Devredilecek ilanları bulur.
 *
 * created_by_agent_id'si boş kalmış eski kayıtlar da yakalansın diye
 * created_by_name üzerinden de eşleşilir — ilanlar sayfasındaki danışman
 * filtresiyle aynı mantık (ilanlar/page.tsx:177).
 */
export async function listTransferableListings(fromAgentId: string) {
  await requireAdmin();

  const from = await fetchAgent(fromAgentId);
  if (!from) return [];

  const nameEsc = from.name.replace(/"/g, '\\"');
  const { data } = await supabaseAdmin
    .from("listings")
    .select("id, listing_id, title, publish_status, price, currency, consultant_name, agent_locked")
    .or(`created_by_agent_id.eq.${from.id},created_by_name.eq."${nameEsc}"`)
    .order("updated_at", { ascending: false });

  return data ?? [];
}

export async function transferListings(input: {
  fromAgentId: string;
  toAgentId: string;
  /** Boş bırakılırsa kaynak danışmanın TÜM ilanları devredilir. */
  listingIds?: string[];
}): Promise<TransferResult> {
  await requireAdmin();

  const fromId = input.fromAgentId?.trim();
  const toId = input.toAgentId?.trim();

  if (!fromId || !toId) return { ok: false, error: "agent_not_found" };
  if (fromId === toId) return { ok: false, error: "same_agent" };

  const [from, to] = await Promise.all([fetchAgent(fromId), fetchAgent(toId)]);
  if (!from || !to) return { ok: false, error: "agent_not_found" };

  // Hedef ilan kimlikleri: seçim yoksa kaynak danışmanın tamamı.
  let targetIds = (input.listingIds ?? []).map((s) => s.trim()).filter(Boolean);
  if (targetIds.length === 0) {
    const rows = await listTransferableListings(fromId);
    targetIds = rows.map((r) => String(r.id));
  }
  if (targetIds.length === 0) return { ok: false, error: "no_listings" };

  const patch = {
    created_by_agent_id: to.id,
    created_by_name: to.name,
    consultant_name: to.name,
    consultant_phone: to.phone,
    consultant_whatsapp: to.whatsapp,
    consultant_email: to.email,
    consultant_photo: to.photo,
    // İçe aktarımın danışmanı geri yazmasını engeller (bkz. migration notu).
    agent_locked: true,
    // Feed'lerdeki last_update bu alandan besleniyor → portallar güncellemeyi görür.
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("listings")
    .update(patch)
    .in("id", targetIds)
    .select("id");

  if (error) return { ok: false, error: "db_error" };

  revalidatePath("/karealfaadmin/ilan-aktarimi");
  revalidatePath("/karealfaadmin/ilanlar");
  revalidatePath("/karealfaadmin/danismanlar");

  return { ok: true, moved: data?.length ?? 0 };
}
