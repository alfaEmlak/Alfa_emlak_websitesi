/**
 * i18n Utility functions for dynamic model translations (Record<locale, data>)
 */

export const SUPPORTED_LOCALES = ['tr', 'en', 'ru', 'de', 'fa'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];

/**
 * Translates a Listing object based on the given locale.
 */
export function getTranslatedListing<T extends { 
  title: string; 
  shortDescription?: string | null; 
  longDescription?: string | null;
  translations?: string | null;
  [key: string]: any;
}>(listing: T, locale: string): T {
  if (!listing.translations || !SUPPORTED_LOCALES.includes(locale as any) || locale === 'tr') {
    return listing;
  }

  try {
    const translations = JSON.parse(listing.translations);
    const langData = translations[locale];

    if (langData) {
      return {
        ...listing,
        title: langData.title || listing.title,
        shortDescription: langData.shortDescription || listing.shortDescription,
        longDescription: langData.longDescription || listing.longDescription,
      };
    }
  } catch (e) {
    console.error('Error parsing listing translations:', e);
  }

  return listing;
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
  translations?: string | null;
  [key: string]: any;
}>(settings: T, locale: string): T {
  if (!settings.translations || !SUPPORTED_LOCALES.includes(locale as any) || locale === 'tr') {
    return settings;
  }

  try {
    const translations = JSON.parse(settings.translations);
    const langData = translations[locale];

    if (langData) {
      return {
        ...settings,
        siteName: langData.siteName || settings.siteName,
        footerAbout: langData.footerAbout || settings.footerAbout,
        heroTitle: langData.heroTitle || settings.heroTitle,
        heroSubtitle: langData.heroSubtitle || settings.heroSubtitle,
        seoTitle: langData.seoTitle || settings.seoTitle,
        seoDescription: langData.seoDescription || settings.seoDescription,
        address: langData.address || settings.address,
      };
    }
  } catch (e) {
    console.error('Error parsing site settings translations:', e);
  }

  return settings;
}
