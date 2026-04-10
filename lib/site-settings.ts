import type { SiteSettings } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { defaultMegaMenu, parseMenuJson, type MenuTopItem } from "@/lib/default-menu";

function offlineSiteSettings(): SiteSettings {
  const now = new Date();
  return {
    id: 1,
    siteName: "ALFA EMLAK",
    logoUrl: null,
    phone: null,
    whatsapp: null,
    email: null,
    address: null,
    socialJson: null,
    footerAbout: null,
    seoTitle: null,
    seoDescription: null,
    heroTitle: null,
    heroSubtitle: null,
    defaultConsultantJson: null,
    menuJson: JSON.stringify(defaultMegaMenu),
    updatedAt: now,
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
  let row = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (!row) {
    row = await prisma.siteSettings.create({
      data: {
        id: 1,
        menuJson: JSON.stringify(defaultMegaMenu),
      },
    });
  }
  return row;
}

/** Veritabanı kapalı / yol hatalı olsa bile sayfa 500 vermesin (yerel geliştirme). */
export async function getSiteSettingsOrFallback(): Promise<SiteSettings> {
  try {
    return await getSiteSettings();
  } catch (e) {
    console.error("[getSiteSettingsOrFallback]", e);
    return offlineSiteSettings();
  }
}

export async function getMegaMenu(): Promise<MenuTopItem[]> {
  const row = await getSiteSettingsOrFallback();
  return parseMenuJson(row.menuJson);
}

export function getSocialLinks(row: { socialJson: string | null }): SocialLinks {
  return parseJson<SocialLinks>(row.socialJson, {});
}

export function getDefaultConsultant(
  row: { defaultConsultantJson: string | null },
): ConsultantDefault {
  return parseJson<ConsultantDefault>(row.defaultConsultantJson, {});
}
