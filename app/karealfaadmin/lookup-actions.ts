"use server";

import { revalidatePath } from "next/cache";
import { requirePanelUser } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LOOKUP_TABLES, isLookupTable, type LookupTableName } from "@/lib/feeds/lookup-meta";

/**
 * 101evler / Hangiev lookup tabloları için CRUD action'ları.
 * Bütün admin paneli "İlan Lookup'ları" sayfasında bu action'lara erişir.
 *
 * Kötüye kullanım önlemi: tablo isimleri allowlist üzerinden kontrol edilir.
 */

function assertTable(table: string): asserts table is LookupTableName {
  if (!isLookupTable(table)) {
    throw new Error(`Geçersiz lookup tablosu: ${table}`);
  }
}

async function requireAdmin() {
  const user = await requirePanelUser();
  if (user.role !== "ADMIN") {
    throw new Error("Bu işlem için admin yetkisi gereklidir.");
  }
  return user;
}

function trim(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function intOrNull(value: FormDataEntryValue | null): number | null {
  const s = trim(value);
  if (s === "") return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

export type SaveLookupResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveLookupRow(
  tableName: string,
  formData: FormData,
): Promise<SaveLookupResult> {
  await requireAdmin();
  assertTable(tableName);
  const meta = LOOKUP_TABLES[tableName];

  const isActive = trim(formData.get("is_active")) === "1";

  if (meta.kind === "currency") {
    const iso = trim(formData.get("iso")).toUpperCase();
    const code = trim(formData.get("code"));
    const label = trim(formData.get("label"));
    if (!iso || !code || !label) {
      return { ok: false, error: "iso, code ve label zorunludur." };
    }
    const codeNumeric = Number(code);
    const codeValue = Number.isFinite(codeNumeric) ? codeNumeric : code;
    const { error } = await supabaseAdmin
      .from(tableName)
      .upsert({ iso, code: codeValue, label, is_active: isActive }, { onConflict: "iso" });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/karealfaadmin/lookups");
    return { ok: true };
  }

  if (meta.kind === "ad_spec") {
    const tag = trim(formData.get("tag"));
    const labelTr = trim(formData.get("label_tr"));
    const labelEn = trim(formData.get("label_en")) || null;
    const sort = intOrNull(formData.get("sort")) ?? 0;
    if (!tag || !labelTr) {
      return { ok: false, error: "tag ve label_tr zorunludur." };
    }
    const { error } = await supabaseAdmin
      .from(tableName)
      .upsert(
        { tag, label_tr: labelTr, label_en: labelEn, sort, is_active: isActive },
        { onConflict: "tag" },
      );
    if (error) return { ok: false, error: error.message };
    revalidatePath("/karealfaadmin/lookups");
    return { ok: true };
  }

  // simple + area
  const id = intOrNull(formData.get("id"));
  const label = trim(formData.get("label"));
  const sort = intOrNull(formData.get("sort")) ?? 0;
  if (id === null || !label) {
    return { ok: false, error: "id ve label zorunludur." };
  }

  const row: Record<string, unknown> = { id, label, sort, is_active: isActive };
  if (meta.kind === "area") {
    const city = trim(formData.get("city"));
    if (!city) return { ok: false, error: "city alanı zorunludur." };
    row.city = city;
  }

  const { error } = await supabaseAdmin
    .from(tableName)
    .upsert(row, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/karealfaadmin/lookups");
  return { ok: true };
}

export async function toggleLookupActive(
  tableName: string,
  pk: { id?: number | null; iso?: string | null; tag?: string | null },
  isActive: boolean,
): Promise<SaveLookupResult> {
  await requireAdmin();
  assertTable(tableName);
  const meta = LOOKUP_TABLES[tableName];

  let query = supabaseAdmin.from(tableName).update({ is_active: isActive });
  if (meta.kind === "currency") {
    if (!pk.iso) return { ok: false, error: "iso eksik." };
    query = query.eq("iso", pk.iso);
  } else if (meta.kind === "ad_spec") {
    if (!pk.tag) return { ok: false, error: "tag eksik." };
    query = query.eq("tag", pk.tag);
  } else {
    if (pk.id == null) return { ok: false, error: "id eksik." };
    query = query.eq("id", pk.id);
  }
  const { error } = await query;
  if (error) return { ok: false, error: error.message };
  revalidatePath("/karealfaadmin/lookups");
  return { ok: true };
}

export async function deleteLookupRow(
  tableName: string,
  pk: { id?: number | null; iso?: string | null; tag?: string | null },
): Promise<SaveLookupResult> {
  await requireAdmin();
  assertTable(tableName);
  const meta = LOOKUP_TABLES[tableName];

  let query = supabaseAdmin.from(tableName).delete();
  if (meta.kind === "currency") {
    if (!pk.iso) return { ok: false, error: "iso eksik." };
    query = query.eq("iso", pk.iso);
  } else if (meta.kind === "ad_spec") {
    if (!pk.tag) return { ok: false, error: "tag eksik." };
    query = query.eq("tag", pk.tag);
  } else {
    if (pk.id == null) return { ok: false, error: "id eksik." };
    query = query.eq("id", pk.id);
  }
  const { error } = await query;
  if (error) return { ok: false, error: error.message };
  revalidatePath("/karealfaadmin/lookups");
  return { ok: true };
}
