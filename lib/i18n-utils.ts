/**
 * i18n Utility functions for dynamic model translations (Record<locale, data>)
 */

export const SUPPORTED_LOCALES = ['tr', 'en', 'ru', 'de', 'fa'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];

/** Supabase jsonb bazen nesne, Prisma / eski kayıtlar bazen string döner */
export function parseRecordTranslations(raw: unknown): Record<string, Record<string, unknown>> | null {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, Record<string, unknown>>;
  }
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return null;
    try {
      const o = JSON.parse(t) as unknown;
      if (o && typeof o === "object" && !Array.isArray(o)) return o as Record<string, Record<string, unknown>>;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Translates a Listing object based on the given locale.
 */
export function getTranslatedListing<T extends { 
  title: string; 
  shortDescription?: string | null; 
  longDescription?: string | null;
  translations?: unknown;
  [key: string]: unknown;
}>(listing: T, locale: string): T {
  if (locale === "tr" || !SUPPORTED_LOCALES.includes(locale as Locale)) {
    return listing;
  }

  const translations = parseRecordTranslations(listing.translations);
  if (!translations) return listing;

  const langData = translations[locale];
  if (!langData) return listing;

  const t = typeof langData.title === "string" && langData.title.trim() ? langData.title : listing.title;
  const s =
    typeof langData.shortDescription === "string" && langData.shortDescription.trim()
      ? langData.shortDescription
      : listing.shortDescription;
  const l =
    typeof langData.longDescription === "string" && langData.longDescription.trim()
      ? langData.longDescription
      : listing.longDescription;

  return {
    ...listing,
    title: t,
    shortDescription: s,
    longDescription: l,
  };
}

/**
 * Translates Site Settings object.
 */
export function getTranslatedSiteSettings<T extends {
  siteName: string;
  footerAbout?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  address?: string | null;
  translations?: unknown;
  [key: string]: unknown;
}>(settings: T, locale: string): T {
  if (locale === "tr" || !SUPPORTED_LOCALES.includes(locale as Locale)) {
    return settings;
  }

  const translations = parseRecordTranslations(settings.translations);
  if (!translations) return settings;

  const langData = translations[locale];
  if (!langData) return settings;

  const pick = (v: unknown, fb: string | null | undefined) =>
    typeof v === "string" && v.trim() ? v.trim() : fb ?? null;

  return {
    ...settings,
    siteName: pick(langData.siteName, settings.siteName) ?? settings.siteName,
    footerAbout: pick(langData.footerAbout, settings.footerAbout),
    heroTitle: pick(langData.heroTitle, settings.heroTitle),
    heroSubtitle: pick(langData.heroSubtitle, settings.heroSubtitle),
    seoTitle: pick(langData.seoTitle, settings.seoTitle),
    seoDescription: pick(langData.seoDescription, settings.seoDescription),
    address: pick(langData.address, settings.address),
  };
}
