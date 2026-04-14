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

export function getSocialLinks(row: { social_json: string | null }): SocialLinks {
  return parseJson<SocialLinks>(row.social_json, {});
}

export function getDefaultConsultant(
  row: { default_consultant_json: string | null },
): ConsultantDefault {
  return parseJson<ConsultantDefault>(row.default_consultant_json, {});
}
