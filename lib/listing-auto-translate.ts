import OpenAI from "openai";
import { parseRecordTranslations, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n-utils";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const LOCALE_LABEL: Record<Locale, string> = {
  tr: "Turkish",
  en: "English",
  ru: "Russian",
  de: "German",
  fa: "Persian (Farsi)",
};

type TranslationsRoot = Record<string, { title?: string; shortDescription?: string; longDescription?: string }>;

function openai() {
  return new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });
}

function httpStatus(e: unknown): number | undefined {
  if (!e || typeof e !== "object") return undefined;
  const s = (e as { status?: number }).status;
  return typeof s === "number" ? s : undefined;
}

function extractJsonObject(text: string): Record<string, string> {
  const t = text.trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("Invalid JSON envelope");
  const parsed = JSON.parse(t.slice(start, end + 1)) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid JSON");
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
    else if (v == null) out[k] = "";
    else out[k] = String(v);
  }
  return out;
}

/** Kaynak: paneldeki Türkçe alanlar (Supabase: description_tr = kısa, description_en = uzun HTML) */
function listingSourceTexts(listing: Record<string, unknown>) {
  const title = String(listing.title ?? "").trim();
  const shortDescription = String(
    listing.description_tr ?? listing.shortDescription ?? listing.short_description ?? "",
  ).trim();
  const longDescription = String(
    listing.description_en ?? listing.long_description ?? listing.longDescription ?? "",
  ).trim();
  return { title, shortDescription, longDescription };
}

function missingKeys(
  bucket: { title?: string; shortDescription?: string; longDescription?: string } | undefined,
  source: { title: string; shortDescription: string; longDescription: string },
): Array<"title" | "shortDescription" | "longDescription"> {
  const need: Array<"title" | "shortDescription" | "longDescription"> = [];
  const b = bucket || {};
  if (source.title && !String(b.title ?? "").trim()) need.push("title");
  if (source.shortDescription && !String(b.shortDescription ?? "").trim()) need.push("shortDescription");
  if (source.longDescription && !String(b.longDescription ?? "").trim()) need.push("longDescription");
  return need;
}

async function sleep(ms: number) {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Gemini 429 / ağ hatalarında sessizce {} — sayfa Türkçe fallback ile açılmaya devam eder. */
async function translateFields(
  keys: Array<"title" | "shortDescription" | "longDescription">,
  source: { title: string; shortDescription: string; longDescription: string },
  locale: Locale,
): Promise<Partial<Record<"title" | "shortDescription" | "longDescription", string>>> {
  const payload: Record<string, string> = {};
  for (const k of keys) payload[k] = source[k];

  const delays = [0, 2800];

  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) await sleep(delays[attempt]);
    try {
      const client = openai();
      const completion = await client.chat.completions.create({
        model: MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `You are a professional translator for North Cyprus real estate listings.
The input fields are primarily in Turkish (sometimes mixed terms). Translate them into ${LOCALE_LABEL[locale]}.
Respond with a single JSON object only (no markdown), with the same keys as requested.
For "longDescription", preserve all HTML tags and attributes; translate only human-readable text nodes and attribute values that are natural language (do not translate URLs or numeric-only content).
Keep a professional, natural tone suitable for property marketing.
Use natural ${LOCALE_LABEL[locale]} throughout (including for ru, de, fa — not English unless the target language is English).`,
          },
          {
            role: "user",
            content: JSON.stringify({ translateKeys: keys, fields: payload }),
          },
        ],
      });

      const text = completion.choices[0]?.message?.content ?? "";
      const parsed = extractJsonObject(text);
      const out: Partial<Record<"title" | "shortDescription" | "longDescription", string>> = {};
      for (const k of keys) {
        const v = parsed[k];
        if (typeof v === "string" && v.trim()) out[k] = v.trim();
      }
      return out;
    } catch (e) {
      const st = httpStatus(e);
      const retry = attempt === 0 && (st === 429 || st === 503 || st === 502);
      if (retry) continue;
      return {};
    }
  }

  return {};
}

/**
 * İlanın `translations` kaydında hedef dil eksikse Gemini ile çevirip Supabase'e yazar;
 * bellekte güncellenmiş listing döner (getTranslatedListing ile kullanın).
 */
export async function ensureListingAutoTranslations<T extends Record<string, unknown>>(
  listing: T,
  locale: string,
): Promise<T> {
  if (locale === "tr") return listing;
  if (!SUPPORTED_LOCALES.includes(locale as Locale)) return listing;
  const loc = locale as Locale;

  if (!process.env.GEMINI_API_KEY?.trim()) return listing;

  const id = listing.id;
  if (typeof id !== "string" || !id) return listing;

  const source = listingSourceTexts(listing);
  if (!source.title && !source.shortDescription && !source.longDescription) return listing;

  const root = (parseRecordTranslations(listing.translations) ?? {}) as TranslationsRoot;
  const bucket = (root[loc] as { title?: string; shortDescription?: string; longDescription?: string } | undefined) || {};
  const keys = missingKeys(bucket, source);
  if (keys.length === 0) return listing;

  const patch = await translateFields(keys, source, loc);
  if (Object.keys(patch).length === 0) return listing;

  const merged: TranslationsRoot = { ...root, [loc]: { ...bucket, ...patch } };
  const translationsJson = JSON.stringify(merged);

  const { error } = await supabaseAdmin
    .from("listings")
    .update({ translations: translationsJson, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[ensureListingAutoTranslations] supabase:", error.message);
    }
    return listing;
  }

  return { ...listing, translations: translationsJson } as T;
}
