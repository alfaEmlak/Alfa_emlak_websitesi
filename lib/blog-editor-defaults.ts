/** `public/alfa-3d-logo.png` — blog kapak varsayılanı (admin “Alfa Emlak logosu” seçeneği). */
export const DEFAULT_BLOG_COVER_URL = "/alfa-3d-logo.png";

export function isDefaultAlfaBlogCover(url: string | undefined | null): boolean {
  if (!url?.trim()) return false;
  const u = url.trim();
  return u === DEFAULT_BLOG_COVER_URL || u.endsWith("/alfa-3d-logo.png") || u.includes("/alfa-3d-logo.png");
}
