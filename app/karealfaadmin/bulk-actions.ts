"use server";

import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";
import { requireAdmin } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { deleteFiles } from "@/lib/supabase/storage";
import { SHOWCASE_MAX_PUBLISHED_FEATURED } from "@/lib/showcase-constants";
import {
  applyAdminListingFilter,
  fetchDistinctListingCities,
  fetchDistinctListingPropertyTypes,
  type AdminListingFilterContext,
} from "@/lib/admin-listing-filter";
import type { BulkAction, BulkPayload, BulkResult, BulkTarget } from "@/components/admin/bulk-types";

/**
 * İlanlara toplu etki eden işlemler (süper admin).
 *
 * Tasarım notları:
 * - Silme yumuşaktır: deleted_at yazılır, publish_status HIDDEN'a çekilir ve
 *   feed/vitrin bayrakları kapatılır. Böylece site, feed'ler ve vitrin ek bir
 *   sorgu değişikliği olmadan temizlenir; çöp kutusundan geri alınabilir.
 * - Hedef, ya açık id listesi ya da ilanlar sayfasındaki filtrenin kendisidir.
 *   Filtre modunda id'ler sunucuda yeniden çözülür — kullanıcının ekranda
 *   gördüğü adet ile işlem gören adet aynı olur.
 * - Her işlem bulk_operations tablosuna tek satır denetim kaydı bırakır.
 */

/** Supabase `.in()` çağrısı başına ilan sayısı (URL/timeout sınırları için). */
const CHUNK_SIZE = 200;
/** Tek bir toplu işlemde izin verilen üst sınır — kazara tüm envanteri vurmayı zorlaştırır. */
const MAX_TARGETS = 20_000;

type ListingPatch = Record<string, unknown>;

const SETTABLE_STATUSES = ["DRAFT", "PUBLISHED", "HIDDEN"] as const;
const VALID_KINDS = ["SATILIK", "KIRALIK", "GUNLUK_KIRALIK", "PROJE"] as const;

// ---------------------------------------------------------------------------
// Hedef çözümleme
// ---------------------------------------------------------------------------

/** Toplu işlemler yalnızca ADMIN'e açık olduğu için kapsam daraltması yok. */
async function buildFilterContext(): Promise<AdminListingFilterContext> {
  const [cityOptions, propertyTypeOptions, agentsRes] = await Promise.all([
    fetchDistinctListingCities(null),
    fetchDistinctListingPropertyTypes(null),
    supabaseAdmin.from("agents").select("id,name").order("name", { ascending: true }),
  ]);

  const agentOptions = (agentsRes.data ?? []).filter(
    (a): a is { id: string; name: string } => !!a?.id && typeof a.name === "string",
  );

  return { cityOptions, propertyTypeOptions, agentOptions, scopeAgentId: null };
}

/**
 * Hedef ilan id'lerini çözer.
 *
 * `includeDeleted` yalnızca çöp kutusu işlemleri (restore / purge) içindir;
 * diğer tüm işlemler silinmiş kayıtlara dokunmaz.
 */
async function resolveTargetIds(
  target: BulkTarget,
  includeDeleted: boolean,
): Promise<{ ids: string[]; error?: string }> {
  if (target.mode === "ids") {
    const ids = [...new Set(target.ids.map((s) => String(s ?? "").trim()).filter(Boolean))];
    if (!ids.length) return { ids: [], error: "no_targets" };
    if (ids.length > MAX_TARGETS) return { ids: [], error: "too_many" };

    // Verilen id'lerin gerçekten var olduğunu (ve silinme durumunun uyduğunu) doğrula.
    const verified: string[] = [];
    for (const chunk of chunked(ids)) {
      let q = supabaseAdmin.from("listings").select("id").in("id", chunk);
      q = includeDeleted ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);
      const { data, error } = await q;
      if (error) return { ids: [], error: "db_error" };
      for (const row of data ?? []) verified.push(String(row.id));
    }
    if (!verified.length) return { ids: [], error: "no_targets" };
    return { ids: verified };
  }

  const ctx = await buildFilterContext();
  const ids: string[] = [];
  const pageSize = 1000;

  for (let from = 0; from < MAX_TARGETS; from += pageSize) {
    let q = applyAdminListingFilter(supabaseAdmin.from("listings").select("id"), target.filter, ctx);
    // applyAdminListingFilter her zaman deleted_at is null uygular; çöp kutusu
    // işlemleri id listesiyle çalıştığı için filtre modunda ters çevirme gerekmiyor.
    q = q.range(from, from + pageSize - 1);

    const { data, error } = await q;
    if (error) return { ids: [], error: "db_error" };
    if (!data?.length) break;
    for (const row of data) ids.push(String(row.id));
    if (data.length < pageSize) break;
  }

  if (!ids.length) return { ids: [], error: "no_targets" };
  return { ids };
}

function* chunked(ids: string[], size = CHUNK_SIZE) {
  for (let i = 0; i < ids.length; i += size) {
    yield ids.slice(i, i + size);
  }
}

/** Aynı patch'i tüm parçalara uygular; etkilenen satır sayısını döner. */
async function applyPatchInChunks(ids: string[], patch: ListingPatch): Promise<{ affected: number; error?: string }> {
  let affected = 0;
  for (const chunk of chunked(ids)) {
    const { data, error } = await supabaseAdmin.from("listings").update(patch).in("id", chunk).select("id");
    if (error) return { affected, error: error.message };
    affected += data?.length ?? 0;
  }
  return { affected };
}

// ---------------------------------------------------------------------------
// Ana giriş noktası
// ---------------------------------------------------------------------------

export async function runBulkAction(input: {
  target: BulkTarget;
  action: BulkAction;
  payload?: BulkPayload;
}): Promise<BulkResult> {
  const user = await requireAdmin();
  const { action, payload = {} } = input;

  const trashScope = action === "restore" || action === "purge";
  const resolved = await resolveTargetIds(input.target, trashScope);
  if (resolved.error) return { ok: false, error: resolved.error };
  const ids = resolved.ids;

  const now = new Date().toISOString();
  let outcome: { affected: number; skipped: number; note?: string };

  try {
    switch (action) {
      case "soft_delete":
        outcome = await doSoftDelete(ids, user.name ?? null, now);
        break;
      case "restore":
        outcome = await doRestore(ids, now);
        break;
      case "purge":
        outcome = await doPurge(ids);
        break;
      case "set_status":
        outcome = await doSetStatus(ids, payload.status, now);
        break;
      case "review":
        outcome = await doReview(ids, payload.decision, user.name ?? null, now);
        break;
      case "assign_agent":
        outcome = await doAssignAgent(ids, payload.agentId, now);
        break;
      case "set_featured":
        outcome = await doSetFeatured(ids, payload.featured === true, now);
        break;
      case "update_price":
        outcome = await doUpdatePrice(ids, payload, now);
        break;
      case "set_feed_flags":
        outcome = await doSetFeedFlags(ids, payload, now);
        break;
      case "set_taxonomy":
        outcome = await doSetTaxonomy(ids, payload, now);
        break;
      default:
        return { ok: false, error: "unknown_action" };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    await recordBulkOperation({
      actorName: user.name ?? null,
      action,
      target: input.target,
      payload,
      affected: 0,
      skipped: ids.length,
      error: message,
    });
    return { ok: false, error: message };
  }

  await recordBulkOperation({
    actorName: user.name ?? null,
    action,
    target: input.target,
    payload,
    affected: outcome.affected,
    skipped: outcome.skipped,
    listingIds: ids,
  });

  revalidateAfterBulk();

  return { ok: true, affected: outcome.affected, skipped: outcome.skipped, note: outcome.note };
}

// ---------------------------------------------------------------------------
// İşlemler
// ---------------------------------------------------------------------------

/**
 * Yumuşak silme. publish_status HIDDEN'a çekilir ve eski değeri saklanır;
 * feed bayrakları ile vitrin işareti kapatılır ki ilan hiçbir dış yüzeyde kalmasın.
 */
async function doSoftDelete(ids: string[], actorName: string | null, now: string) {
  // Eski yayın durumu kayıt başına saklanmalı; satır satır UPDATE binlerce
  // gidiş-dönüş demek olurdu. Bunun yerine ilanları mevcut durumlarına göre
  // gruplayıp grup başına tek batch update atıyoruz (en fazla 5 grup).
  const byStatus = new Map<string, string[]>();
  const featuredIds: string[] = [];

  for (const chunk of chunked(ids)) {
    const { data: rows, error } = await supabaseAdmin
      .from("listings")
      .select("id, publish_status, badges")
      .in("id", chunk);
    if (error) throw new Error(error.message);

    for (const row of rows ?? []) {
      const status = typeof row.publish_status === "string" ? row.publish_status : "";
      const bucket = byStatus.get(status);
      if (bucket) bucket.push(String(row.id));
      else byStatus.set(status, [String(row.id)]);

      // badges jsonb'si kayıt bazında farklı olabildiği için vitrin işaretini
      // yalnızca gerçekten işaretli olanlarda temizliyoruz.
      if (isFeatured(row.badges)) featuredIds.push(String(row.id));
    }
  }

  let affected = 0;
  for (const [status, groupIds] of byStatus) {
    const patch: ListingPatch = {
      deleted_at: now,
      deleted_by_name: actorName,
      status_before_delete: status || null,
      publish_status: "HIDDEN",
      export_to_101evler: false,
      export_to_hangiev: false,
      updated_at: now,
    };
    const result = await applyPatchInChunks(groupIds, patch);
    if (result.error) throw new Error(result.error);
    affected += result.affected;
  }

  // Vitrindekiler için badges'i tek tek güncelliyoruz — sayıları sınırlı (en fazla 9).
  for (const chunk of chunked(featuredIds)) {
    const { data: rows, error } = await supabaseAdmin.from("listings").select("id, badges").in("id", chunk);
    if (error) throw new Error(error.message);
    for (const row of rows ?? []) {
      const { error: updErr } = await supabaseAdmin
        .from("listings")
        .update({ badges: withFeatured(row.badges, false) })
        .eq("id", row.id);
      if (updErr) throw new Error(updErr.message);
    }
  }

  return { affected, skipped: ids.length - affected };
}

/** Geri yükleme: silinmeden önceki yayın durumunu geri koyar. Feed bayrakları kapalı kalır. */
async function doRestore(ids: string[], now: string) {
  // Silme ile aynı mantık: geri yüklenecek duruma göre grupla, grup başına tek update.
  const byPrevious = new Map<string, string[]>();

  for (const chunk of chunked(ids)) {
    const { data: rows, error } = await supabaseAdmin
      .from("listings")
      .select("id, status_before_delete")
      .in("id", chunk);
    if (error) throw new Error(error.message);

    for (const row of rows ?? []) {
      const previous =
        typeof row.status_before_delete === "string" && row.status_before_delete
          ? row.status_before_delete
          : "DRAFT";
      const bucket = byPrevious.get(previous);
      if (bucket) bucket.push(String(row.id));
      else byPrevious.set(previous, [String(row.id)]);
    }
  }

  let affected = 0;
  for (const [previous, groupIds] of byPrevious) {
    const result = await applyPatchInChunks(groupIds, {
      deleted_at: null,
      deleted_by_name: null,
      status_before_delete: null,
      publish_status: previous,
      updated_at: now,
    });
    if (result.error) throw new Error(result.error);
    affected += result.affected;
  }

  return {
    affected,
    skipped: ids.length - affected,
    note: "feed_flags_reset",
  };
}

/**
 * Kalıcı silme. listing_images satırları cascade ile gider; Storage'daki
 * dosyalar burada temizlenmezse yetim kalacağı için önce onlar silinir.
 */
async function doPurge(ids: string[]) {
  let affected = 0;

  for (const chunk of chunked(ids)) {
    const { data: images } = await supabaseAdmin
      .from("listing_images")
      .select("url")
      .in("listing_id", chunk);
    const { data: covers } = await supabaseAdmin
      .from("listings")
      .select("cover_image")
      .in("id", chunk);

    const paths = new Set<string>();
    for (const row of images ?? []) {
      const key = storageKeyFromPublicUrl(row.url);
      if (key) paths.add(key);
    }
    for (const row of covers ?? []) {
      const key = storageKeyFromPublicUrl(row.cover_image);
      if (key) paths.add(key);
    }

    if (paths.size) {
      try {
        await deleteFiles([...paths]);
      } catch (err) {
        // Dosya temizliği başarısız olsa da kayıt silinmeli; yetim dosya
        // veri kaybından iyidir.
        console.warn("[bulk purge] storage temizliği başarısız:", err);
      }
    }

    const { data, error } = await supabaseAdmin.from("listings").delete().in("id", chunk).select("id");
    if (error) throw new Error(error.message);
    affected += data?.length ?? 0;
  }

  return { affected, skipped: ids.length - affected };
}

async function doSetStatus(ids: string[], status: string | undefined, now: string) {
  if (!status || !(SETTABLE_STATUSES as readonly string[]).includes(status)) {
    throw new Error("invalid_status");
  }
  const result = await applyPatchInChunks(ids, { publish_status: status, updated_at: now });
  if (result.error) throw new Error(result.error);
  return { affected: result.affected, skipped: ids.length - result.affected };
}

/**
 * Toplu onay/red. Onayda tekil akıştaki fotoğraf kuralı korunur:
 * kapak görseli veya en az bir listing_images kaydı olmayan ilanlar atlanır.
 */
async function doReview(
  ids: string[],
  decision: "approve" | "reject" | undefined,
  actorName: string | null,
  now: string,
) {
  if (decision !== "approve" && decision !== "reject") throw new Error("invalid_decision");

  let eligible = ids;
  let skippedNoPhoto = 0;

  if (decision === "approve") {
    const withPhoto = new Set<string>();
    for (const chunk of chunked(ids)) {
      const [coverRes, imageRes] = await Promise.all([
        supabaseAdmin.from("listings").select("id, cover_image").in("id", chunk),
        supabaseAdmin.from("listing_images").select("listing_id").in("listing_id", chunk),
      ]);
      for (const row of coverRes.data ?? []) {
        if (String(row.cover_image ?? "").trim()) withPhoto.add(String(row.id));
      }
      for (const row of imageRes.data ?? []) withPhoto.add(String(row.listing_id));
    }
    eligible = ids.filter((id) => withPhoto.has(id));
    skippedNoPhoto = ids.length - eligible.length;
  }

  if (!eligible.length) {
    return { affected: 0, skipped: skippedNoPhoto, note: "no_photo" };
  }

  const patch: ListingPatch = {
    publish_status: decision === "approve" ? "PUBLISHED" : "REJECTED",
    approval_submitted_at: null,
    approved_at: decision === "approve" ? now : null,
    approved_by_name: decision === "approve" ? actorName : null,
    rejected_at: decision === "reject" ? now : null,
    rejected_by_name: decision === "reject" ? actorName : null,
    updated_at: now,
  };

  const result = await applyPatchInChunks(eligible, patch);
  if (result.error) throw new Error(result.error);

  return {
    affected: result.affected,
    skipped: skippedNoPhoto + (eligible.length - result.affected),
    note: skippedNoPhoto > 0 ? "no_photo" : undefined,
  };
}

/**
 * Toplu danışman ataması. Feed'ler danışman bilgisini ilanın kendi consultant_*
 * kolonlarından okuduğu için ilan aktarımıyla aynı alan seti yazılır.
 */
async function doAssignAgent(ids: string[], agentId: string | undefined, now: string) {
  const id = String(agentId ?? "").trim();
  if (!id) throw new Error("agent_not_found");

  const { data: agent } = await supabaseAdmin
    .from("agents")
    .select("id, name, phone, whatsapp, email, photo")
    .eq("id", id)
    .maybeSingle();
  if (!agent || typeof agent.name !== "string") throw new Error("agent_not_found");

  const patch: ListingPatch = {
    created_by_agent_id: agent.id,
    created_by_name: agent.name,
    consultant_name: agent.name,
    consultant_phone: agent.phone ?? null,
    consultant_whatsapp: agent.whatsapp ?? null,
    consultant_email: agent.email ?? null,
    consultant_photo: agent.photo ?? null,
    // İçe aktarımın danışmanı geri yazmasını engeller (ilan aktarımıyla aynı).
    agent_locked: true,
    updated_at: now,
  };

  const result = await applyPatchInChunks(ids, patch);
  if (result.error) throw new Error(result.error);
  return { affected: result.affected, skipped: ids.length - result.affected };
}

/**
 * Vitrin bayrağı badges jsonb'si içinde tutulduğu için kayıt bazında
 * okuma-yazma gerekiyor. Vitrindeki yayınlanmış ilan sınırı sunucuda zorlanır.
 */
async function doSetFeatured(ids: string[], featured: boolean, now: string) {
  let remainingSlots = Number.POSITIVE_INFINITY;

  if (featured) {
    const { count } = await supabaseAdmin
      .from("listings")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("publish_status", "PUBLISHED")
      .contains("badges", { featured: true });
    remainingSlots = Math.max(0, SHOWCASE_MAX_PUBLISHED_FEATURED - (count ?? 0));
  }

  let affected = 0;
  let skipped = 0;

  for (const chunk of chunked(ids)) {
    const { data: rows, error } = await supabaseAdmin
      .from("listings")
      .select("id, badges, publish_status")
      .in("id", chunk);
    if (error) throw new Error(error.message);

    for (const row of rows ?? []) {
      const already = isFeatured(row.badges);
      if (already === featured) {
        skipped += 1;
        continue;
      }
      // Sınır yalnızca yayındaki ilanlar için geçerli (vitrin sayfasıyla aynı kural).
      if (featured && row.publish_status === "PUBLISHED") {
        if (remainingSlots <= 0) {
          skipped += 1;
          continue;
        }
        remainingSlots -= 1;
      }

      const { error: updErr } = await supabaseAdmin
        .from("listings")
        .update({ badges: withFeatured(row.badges, featured), updated_at: now })
        .eq("id", row.id);
      if (updErr) throw new Error(updErr.message);
      affected += 1;
    }
  }

  return {
    affected,
    skipped,
    note: featured && skipped > 0 ? "featured_limit" : undefined,
  };
}

/** Yüzdesel veya sabit tutarlı fiyat güncellemesi. Sonucu ≤ 0 olan ilanlar atlanır. */
async function doUpdatePrice(ids: string[], payload: BulkPayload, now: string) {
  const mode = payload.priceMode;
  const value = Number(payload.priceValue);
  if (mode !== "percent" && mode !== "amount") throw new Error("invalid_price_mode");
  if (!Number.isFinite(value) || value === 0) throw new Error("invalid_price_value");

  const rounding = Number.isFinite(Number(payload.priceRounding)) ? Number(payload.priceRounding) : 0;

  let affected = 0;
  let skipped = 0;

  for (const chunk of chunked(ids)) {
    const { data: rows, error } = await supabaseAdmin.from("listings").select("id, price").in("id", chunk);
    if (error) throw new Error(error.message);

    for (const row of rows ?? []) {
      const current = Number(row.price);
      if (!Number.isFinite(current) || current <= 0) {
        skipped += 1;
        continue;
      }

      let next = mode === "percent" ? current * (1 + value / 100) : current + value;
      if (rounding > 0) next = Math.round(next / rounding) * rounding;
      next = Math.round(next * 100) / 100;

      if (next <= 0) {
        skipped += 1;
        continue;
      }

      const { error: updErr } = await supabaseAdmin
        .from("listings")
        .update({ price: next, updated_at: now })
        .eq("id", row.id);
      if (updErr) throw new Error(updErr.message);
      affected += 1;
    }
  }

  return { affected, skipped };
}

async function doSetFeedFlags(ids: string[], payload: BulkPayload, now: string) {
  const patch: ListingPatch = { updated_at: now };
  if (typeof payload.export101 === "boolean") patch.export_to_101evler = payload.export101;
  if (typeof payload.exportHangiev === "boolean") patch.export_to_hangiev = payload.exportHangiev;
  if (Object.keys(patch).length === 1) throw new Error("no_changes");

  const result = await applyPatchInChunks(ids, patch);
  if (result.error) throw new Error(result.error);
  return { affected: result.affected, skipped: ids.length - result.affected };
}

async function doSetTaxonomy(ids: string[], payload: BulkPayload, now: string) {
  const patch: ListingPatch = { updated_at: now };

  const kind = String(payload.kind ?? "").trim();
  if (kind) {
    if (!(VALID_KINDS as readonly string[]).includes(kind)) throw new Error("invalid_kind");
    patch.kind = kind;
  }

  const propertyType = String(payload.propertyType ?? "").trim();
  if (propertyType) patch.property_type = propertyType;

  const city = String(payload.city ?? "").trim();
  if (city) patch.city = city;

  const region = String(payload.region ?? "").trim();
  if (region) patch.region = region;

  if (Object.keys(patch).length === 1) throw new Error("no_changes");

  const result = await applyPatchInChunks(ids, patch);
  if (result.error) throw new Error(result.error);
  return { affected: result.affected, skipped: ids.length - result.affected };
}

// ---------------------------------------------------------------------------
// CSV dışa aktarma (mutasyon değil)
// ---------------------------------------------------------------------------

const CSV_COLUMNS = [
  "listing_id",
  "title",
  "kind",
  "property_type",
  "city",
  "region",
  "neighborhood",
  "price",
  "currency",
  "publish_status",
  "bedrooms",
  "bathrooms",
  "area_m2",
  "created_by_name",
  "consultant_name",
  "consultant_phone",
  "export_to_101evler",
  "export_to_hangiev",
  "created_at",
  "updated_at",
] as const;

export async function exportListingsCsv(target: BulkTarget): Promise<
  { ok: true; csv: string; rows: number } | { ok: false; error: string }
> {
  await requireAdmin();

  const resolved = await resolveTargetIds(target, false);
  if (resolved.error) return { ok: false, error: resolved.error };

  const lines: string[] = [CSV_COLUMNS.join(";")];

  for (const chunk of chunked(resolved.ids)) {
    const { data, error } = await supabaseAdmin
      .from("listings")
      .select(CSV_COLUMNS.join(","))
      .in("id", chunk)
      .order("updated_at", { ascending: false });
    if (error) return { ok: false, error: "db_error" };

    for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
      lines.push(CSV_COLUMNS.map((col) => csvCell(row[col])).join(";"));
    }
  }

  // Excel'in UTF-8'i doğru okuması için BOM.
  return { ok: true, csv: `﻿${lines.join("\r\n")}`, rows: lines.length - 1 };
}

function csvCell(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (/[";\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

/** badges alanı jsonb veya JSON metni olabiliyor; ikisini de tolere ediyoruz. */
function parseBadges(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return { ...(raw as Record<string, unknown>) };
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { ...(parsed as Record<string, unknown>) };
      }
    } catch {
      /* bozuk JSON: boş kabul et */
    }
  }
  return {};
}

function isFeatured(raw: unknown): boolean {
  return parseBadges(raw).featured === true;
}

function withFeatured(raw: unknown, featured: boolean): Record<string, unknown> {
  const badges = parseBadges(raw);
  badges.featured = featured;
  return badges;
}

/**
 * listing_images.url public URL tutuyor; Storage'dan silmek için bucket
 * sonrasındaki object key'i çıkarmak gerekiyor.
 * .../storage/v1/object/public/uploads/<key> → <key>
 */
function storageKeyFromPublicUrl(value: unknown): string | null {
  const url = typeof value === "string" ? value.trim() : "";
  if (!url) return null;
  const marker = "/storage/v1/object/public/uploads/";
  const at = url.indexOf(marker);
  if (at === -1) return null;
  const key = url.slice(at + marker.length).split("?")[0];
  return key ? decodeURIComponent(key) : null;
}

async function recordBulkOperation(entry: {
  actorName: string | null;
  action: BulkAction;
  target: BulkTarget;
  payload: BulkPayload;
  affected: number;
  skipped: number;
  listingIds?: string[];
  error?: string;
}) {
  const { error } = await supabaseAdmin.from("bulk_operations").insert({
    actor_name: entry.actorName,
    action: entry.action,
    scope: entry.target.mode === "filter" ? "filter" : "selection",
    filter_json: entry.target.mode === "filter" ? entry.target.filter : null,
    payload: entry.payload,
    affected_count: entry.affected,
    skipped_count: entry.skipped,
    // Geri izlenebilirlik için ilk 500 id yeterli; tamamı satırı gereksiz şişirir.
    listing_ids: entry.listingIds ? entry.listingIds.slice(0, 500) : null,
    error: entry.error ?? null,
  });

  // Denetim kaydı yazılamazsa asıl işlem geri alınmaz; yalnızca loglanır.
  if (error) console.error("[bulk_operations] kayıt yazılamadı:", error.message);
}

function revalidateAfterBulk() {
  revalidatePath("/");
  revalidatePath("/ilanlar");
  for (const loc of routing.locales) {
    revalidatePath(`/${loc}`);
    revalidatePath(`/${loc}/ilanlar`);
  }
  revalidatePath("/karealfaadmin/ilanlar");
  revalidatePath("/karealfaadmin/ilanlar/vitrin");
  revalidatePath("/karealfaadmin/ilanlar/cop-kutusu");
  revalidatePath("/karealfaadmin/dashboard");
  revalidatePath("/karealfaadmin/onay-bekleyen");
  revalidatePath("/karealfaadmin/feed-durum");
  revalidatePath("/karealfaadmin/toplu-islem-gecmisi");
}
