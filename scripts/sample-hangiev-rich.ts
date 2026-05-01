/**
 * Hangiev "ilk temas" örneği.
 *
 * Hangiev henüz XML şemasını paylaşmadığı için, mümkün olan tüm bilgiyi
 * TEXT alanları olarak içeren zengin bir örnek XML üretir. Hangiev bu XML'i
 * görünce kendi ID listelerini (property_type_id, area_id, vb.) iletebilir;
 * sonrasında /api/feeds/hangiev.xml endpoint'i kullanılır.
 *
 * Kullanım:
 *   npx tsx --env-file=.env scripts/sample-hangiev-rich.ts AE-2026-96331
 *
 * Çıktı:
 *   scratch/hangiev-sample-<listing_id>.xml
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { BILLING_CYCLE_OPTIONS, TITLE_TYPE_OPTIONS } from "../lib/feeds/101evler-constants";
import { HANGIEV_PROPERTY_TYPE_OPTIONS } from "../lib/feeds/hangiev-constants";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");

const listingId = process.argv[2]?.trim();
if (!listingId) {
  console.error("Hata: listing_id zorunlu. Örnek:");
  console.error("  npx tsx --env-file=.env scripts/sample-hangiev-rich.ts AE-2026-96331");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Hata: NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY .env içinde olmalı.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function tag(name: string, value: unknown, opts?: { cdata?: boolean }): string {
  if (value === null || value === undefined) return "";
  const s = String(value).trim();
  if (s === "") return "";
  if (opts?.cdata) return `    <${name}><![CDATA[${s}]]></${name}>\n`;
  return `    <${name}>${escapeXml(s)}</${name}>\n`;
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().replace("T", " ").substring(0, 19);
}

function getTranslation(
  translations: unknown,
  lang: string,
  field: "title" | "shortDescription" | "longDescription",
): string {
  if (!translations) return "";
  let parsed: Record<string, Record<string, string>> | null = null;
  if (typeof translations === "string") {
    try { parsed = JSON.parse(translations); } catch { return ""; }
  } else if (typeof translations === "object") {
    parsed = translations as Record<string, Record<string, string>>;
  }
  return parsed?.[lang]?.[field]?.trim() ?? "";
}

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === "string");
    } catch { /* ignore */ }
  }
  return [];
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function labelFromOptions(
  value: unknown,
  options: Array<{ id: string | number; label: string }>,
): string {
  if (value === null || value === undefined || value === "") return "";
  const match = options.find((option) => String(option.id) === String(value));
  return match?.label ?? "";
}

function normalizedKey(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]/g, "");
}

function getDetailValue(details: Record<string, unknown>, keys: string[]): unknown {
  const normalized = new Map(Object.entries(details).map(([key, value]) => [normalizedKey(key), value]));
  for (const key of keys) {
    const value = normalized.get(normalizedKey(key));
    if (value !== null && value !== undefined && String(value).trim() !== "") return value;
  }
  return null;
}

function mapKind(kind: string | null | undefined): string {
  switch (kind) {
    case "SATILIK": return "SALE";
    case "KIRALIK": return "RENT";
    case "GUNLUK_KIRALIK": return "DAILY_RENT";
    case "PROJE": return "PROJECT";
    default: return "";
  }
}

async function main() {
  const { data: listing, error } = await supabase
    .from("listings")
    .select("*, listing_images(url, sort_order, is_primary)")
    .eq("listing_id", listingId)
    .single();

  if (error || !listing) {
    console.error(`İlan bulunamadı: ${listingId}`);
    if (error) console.error(error.message);
    process.exit(2);
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const detailUrl = `${siteUrl.replace(/\/$/, "")}/tr/ilan/${listing.listing_id}`;

  const titleTr =
    getTranslation(listing.translations, "tr", "title") || listing.title || "";
  const titleEn = getTranslation(listing.translations, "en", "title");
  const titleRu = getTranslation(listing.translations, "ru", "title");
  const titleDe = getTranslation(listing.translations, "de", "title");
  const titleFa = getTranslation(listing.translations, "fa", "title");
  const descTr =
    getTranslation(listing.translations, "tr", "longDescription") ||
    listing.description_tr ||
    titleTr ||
    "";
  const descEn =
    getTranslation(listing.translations, "en", "longDescription") ||
    listing.description_en ||
    "";
  const descRu = getTranslation(listing.translations, "ru", "longDescription");
  const descDe = getTranslation(listing.translations, "de", "longDescription");
  const descFa = getTranslation(listing.translations, "fa", "longDescription");

  const features = asArray(listing.features);
  const extHangiev = asObject(listing.ext_hangiev);
  const ext101evler = asObject(listing.ext_101evler);
  const details = asObject(listing.detail_fields);
  const propertySubtype =
    labelFromOptions(
      (listing as Record<string, unknown>).property_type_id_hg ?? extHangiev.property_type_id,
      HANGIEV_PROPERTY_TYPE_OPTIONS,
    ) ||
    (listing.property_type && !["Konut", "Ticari"].includes(String(listing.property_type))
      ? String(listing.property_type)
      : "") ||
    (listing.property_type === "Konut" ? "Daire" : "");
  const titleTypeId = (listing as Record<string, unknown>).title_type_id_101 ?? ext101evler.title_type_id;
  const billingCycleId =
    (listing as Record<string, unknown>).billing_cycle_id_101 ?? ext101evler.billing_cycle_id;

  const images = (listing.listing_images ?? []) as Array<{
    url: string;
    sort_order?: number;
    is_primary?: boolean;
  }>;
  const sortedImages = [...images].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );

  let imagesXml = "";
  if (sortedImages.length > 0) {
    imagesXml += "    <images>\n";
    sortedImages.forEach((img, idx) => {
      if (!img.url) return;
      imagesXml += `      <image>\n`;
      imagesXml += `        <url>${escapeXml(img.url)}</url>\n`;
      imagesXml += `        <order>${idx + 1}</order>\n`;
      if (img.is_primary) imagesXml += `        <is_primary>true</is_primary>\n`;
      imagesXml += `      </image>\n`;
    });
    imagesXml += "    </images>\n";
  }

  let featuresXml = "";
  if (features.length > 0) {
    featuresXml += "    <features>\n";
    for (const f of features) {
      featuresXml += `      <feature>${escapeXml(f)}</feature>\n`;
    }
    featuresXml += "    </features>\n";
  }

  let detailsXml = "";
  const detailEntries = Object.entries(details).filter(([, value]) => (
    value !== null && value !== undefined && String(value).trim() !== ""
  ));
  if (detailEntries.length > 0) {
    detailsXml += "    <details>\n";
    for (const [name, value] of detailEntries) {
      detailsXml += "      <detail>\n";
      detailsXml += `        <name>${escapeXml(name)}</name>\n`;
      detailsXml += `        <value>${escapeXml(String(value))}</value>\n`;
      detailsXml += "      </detail>\n";
    }
    detailsXml += "    </details>\n";
  }

  const inner =
    tag("external_id", listing.id) +
    tag("reference_no", listing.listing_id) +
    tag("last_update", fmtDate(listing.updated_at ?? listing.created_at)) +
    tag("created_at", fmtDate(listing.created_at)) +
    tag("publish_status", listing.publish_status) +
    tag("kind", mapKind(listing.kind)) +
    tag("kind_label_tr", listing.kind) +
    tag("property_type", listing.property_type) +
    tag("property_subtype", propertySubtype) +
    tag("city", listing.city) +
    tag("region", listing.region) +
    tag("neighborhood", listing.neighborhood) +
    tag("full_address", (listing as Record<string, unknown>).full_address ?? null) +
    tag("title_tr", titleTr, { cdata: true }) +
    tag("title_en", titleEn, { cdata: true }) +
    tag("title_ru", titleRu, { cdata: true }) +
    tag("title_de", titleDe, { cdata: true }) +
    tag("title_fa", titleFa, { cdata: true }) +
    tag("description_tr", descTr, { cdata: true }) +
    tag("description_en", descEn, { cdata: true }) +
    tag("description_ru", descRu, { cdata: true }) +
    tag("description_de", descDe, { cdata: true }) +
    tag("description_fa", descFa, { cdata: true }) +
    tag("price", listing.price) +
    tag("currency", listing.currency) +
    tag("billing_cycle_id", listing.kind === "KIRALIK" ? billingCycleId : null) +
    tag("billing_cycle", listing.kind === "KIRALIK" ? labelFromOptions(billingCycleId, BILLING_CYCLE_OPTIONS) : null) +
    tag("deposit_amount", listing.kind === "KIRALIK" ? getDetailValue(details, ["deposit", "depozito", "depozito miktarı", "depozito miktari"]) : null) +
    tag("minimum_rental_period", listing.kind === "KIRALIK" ? getDetailValue(details, ["minimum süre", "minimum sure", "minimum kira süresi", "minimum kira suresi"]) : null) +
    tag("bedrooms", (listing as Record<string, unknown>).bedrooms ?? null) +
    tag("bathrooms", (listing as Record<string, unknown>).bathrooms ?? null) +
    tag("living_rooms", (listing as Record<string, unknown>).living_rooms ?? null) +
    tag("floor", (listing as Record<string, unknown>).floor ?? null) +
    tag("area_m2", (listing as Record<string, unknown>).area_m2 ?? null) +
    tag("plot_area_m2", (listing as Record<string, unknown>).plot_area_m2 ?? null) +
    tag("building_age", (listing as Record<string, unknown>).building_age ?? null) +
    tag("furnished", (listing as Record<string, unknown>).furnished ?? null) +
    tag("title_type_id", titleTypeId) +
    tag("title_deed_type", labelFromOptions(titleTypeId, TITLE_TYPE_OPTIONS) || getDetailValue(details, ["koçan türü", "kocan turu", "title deed"])) +
    tag("has_pool", listing.has_pool) +
    tag("has_garden", listing.has_garden) +
    tag("has_fireplace", listing.has_fireplace) +
    tag("has_parking", listing.has_parking) +
    tag("sea_view", listing.sea_view) +
    tag("latitude", listing.latitude) +
    tag("longitude", listing.longitude) +
    tag("video_url", listing.video_url) +
    tag("virtual_tour_url", listing.virtual_tour_url) +
    tag("consultant_name", listing.consultant_name) +
    tag("consultant_phone", listing.consultant_phone) +
    tag("consultant_whatsapp", listing.consultant_whatsapp) +
    tag("consultant_email", listing.consultant_email) +
    tag("detail_url", detailUrl) +
    featuresXml +
    detailsXml +
    imagesXml;

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!--\n` +
    `  Alfa Emlak — Hangiev örnek katalog feed'i (tek ilan).\n` +
    `  Bu XML şu an Hangiev'in resmî şemasına bağlı değildir; mevcut tüm\n` +
    `  bilgi text/CDATA olarak gönderilir. Hangiev kendi ID listesini\n` +
    `  paylaştıktan sonra /api/feeds/hangiev.xml?token=... endpoint'i\n` +
    `  bu ID'leri ekleyerek prod beslemesini üretecektir.\n` +
    `-->\n` +
    `<catalog generated_at="${new Date().toISOString()}" source="Alfa Emlak">\n` +
    `  <listing>\n` +
    inner +
    `  </listing>\n` +
    `</catalog>\n`;

  const outDir = resolve(projectRoot, "scratch");
  await mkdir(outDir, { recursive: true });
  const xmlPath = resolve(outDir, `hangiev-sample-${listingId}.xml`);
  await writeFile(xmlPath, xml, "utf8");

  console.log("──────────────────────────────────────────────");
  console.log(" Hangiev rich-sample XML üretildi");
  console.log("──────────────────────────────────────────────");
  console.log(` listing_id : ${listingId}`);
  console.log(` site_url   : ${siteUrl}`);
  console.log(` images     : ${sortedImages.length}`);
  console.log(` features   : ${features.length}`);
  console.log(` XML        : ${xmlPath}`);
  console.log("──────────────────────────────────────────────");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
