import { supabaseAdmin } from "@/lib/supabase/admin";
import { defaultMegaMenu, parseMenuJson, type MenuTopItem } from "@/lib/default-menu";

function offlineSiteSettings(): any {
  const now = new Date();
  return {
    id: 1,
    site_name: "ALFA EMLAK",
    logo_url: null,
    contact_phone: null,
    contact_email: null,
    contact_address: null,
    social_json: null,
    footer_about: null,
    seo_meta_title: null,
    seo_meta_description: null,
    hero_title: null,
    hero_subtitle: null,
    default_consultant_json: null,
    menu_json: JSON.stringify(defaultMegaMenu),
    slider_json: null,
    analysis_json: null,
    translations: null,
    updated_at: now.toISOString(),
  };
}

export type SocialLinks = {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  x?: string;
};

export type ConsultantDefault = {
  name?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  office?: string;
  photo?: string;
  logo?: string;
};

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function getSiteSettings() {
  const { data: row, error } = await supabaseAdmin
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();
  
  if (error || !row) {
    // Create if doesn't exist
    const { data: newRow } = await supabaseAdmin
      .from("site_settings")
      .insert({ id: 1, menu_json: JSON.stringify(defaultMegaMenu) })
      .select()
      .single();
    
    return newRow || offlineSiteSettings();
  }
  
  return row;
}

/** Veritabanı kapalı / yol hatalı olsa bile sayfa 500 vermesin (yerel geliştirme). */
export async function getSiteSettingsOrFallback(): Promise<any> {
  try {
    return await getSiteSettings();
  } catch (e) {
    console.error("[getSiteSettingsOrFallback]", e);
    return offlineSiteSettings();
  }
}

export async function getMegaMenu(): Promise<MenuTopItem[]> {
  const row = await getSiteSettingsOrFallback();
  return parseMenuJson(row.menu_json);
}

export function getSocialLinks(row: { social_json: string | Record<string, unknown> | null }): SocialLinks {
  const raw = row.social_json;
  if (raw == null) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as SocialLinks;
  }
  if (typeof raw === "string") {
    return parseJson<SocialLinks>(raw, {});
  }
  return {};
}

/** SocialLinksBar ile aynı filtre: gösterilecek en az bir URL var mı */
export function hasVisibleSocialLinks(social: SocialLinks): boolean {
  return Boolean(
    social.facebook?.trim() ||
      social.instagram?.trim() ||
      social.linkedin?.trim() ||
      social.youtube?.trim(),
  );
}

export function getDefaultConsultant(
  row: { default_consultant_json: string | null },
): ConsultantDefault {
  return parseJson<ConsultantDefault>(row.default_consultant_json, {});
}

export type SliderSettings = {
  images: string[];
  interval: number;
};

export function getSliderSettings(row: { slider_json: string | null }): SliderSettings {
  return parseJson<SliderSettings>(row.slider_json, { images: [], interval: 5000 });
}

/** Ana sayfadaki "Analiz" panelinin admin'den düzenlenebilir değerleri. */
export type AnalysisSettings = {
  label: string;
  title: string;
  description: string;
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  disclaimer: string;
  chartTitle: string;
  exampleBadge: string;
  startYear: string;
  endYear: string;
  bars: number[];
};

export const ANALYSIS_DEFAULT_BARS = [20, 35, 30, 55, 45, 75, 90];

/**
 * analysis_json kolonunu okur. Metin alanları boş bırakılabilir (o durumda
 * çağıran taraf i18n çevirisine düşer); yapısal alanlar (yıllar, barlar)
 * için makul varsayılanlar döner.
 */
export function getAnalysisSettings(
  row: { analysis_json: string | Record<string, unknown> | null },
): AnalysisSettings {
  const raw = row.analysis_json;
  const parsed: Partial<AnalysisSettings> =
    raw == null
      ? {}
      : typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Partial<AnalysisSettings>)
        : typeof raw === "string"
          ? parseJson<Partial<AnalysisSettings>>(raw, {})
          : {};

  const bars = Array.isArray(parsed.bars)
    ? parsed.bars.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 0)
    : [];

  return {
    label: typeof parsed.label === "string" ? parsed.label : "",
    title: typeof parsed.title === "string" ? parsed.title : "",
    description: typeof parsed.description === "string" ? parsed.description : "",
    stat1Value: typeof parsed.stat1Value === "string" ? parsed.stat1Value : "",
    stat1Label: typeof parsed.stat1Label === "string" ? parsed.stat1Label : "",
    stat2Value: typeof parsed.stat2Value === "string" ? parsed.stat2Value : "",
    stat2Label: typeof parsed.stat2Label === "string" ? parsed.stat2Label : "",
    disclaimer: typeof parsed.disclaimer === "string" ? parsed.disclaimer : "",
    chartTitle: typeof parsed.chartTitle === "string" ? parsed.chartTitle : "",
    exampleBadge: typeof parsed.exampleBadge === "string" ? parsed.exampleBadge : "",
    startYear: typeof parsed.startYear === "string" ? parsed.startYear : "",
    endYear: typeof parsed.endYear === "string" ? parsed.endYear : "",
    bars: bars.length > 0 ? bars : ANALYSIS_DEFAULT_BARS,
  };
}

export type AiAssistantSettings = {
  /** Admin'in eklediği persona/üslup/eğitim talimatı (sabit guardrail promptuna eklenir). */
  systemPrompt: string;
  /** Opsiyonel model override (boşsa env/GEMINI_MODEL kullanılır). */
  model: string;
};

export function getAiAssistantSettings(
  row: { ai_system_prompt?: string | null; ai_model?: string | null } | null | undefined,
): AiAssistantSettings {
  return {
    systemPrompt: typeof row?.ai_system_prompt === "string" ? row.ai_system_prompt.trim() : "",
    model: typeof row?.ai_model === "string" ? row.ai_model.trim() : "",
  };
}
