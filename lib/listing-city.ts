import { kktcCities, kktcRegions } from "@/lib/kktc-regions";

export const LEFKOSA_SLUG = "lefkosa";

function foldCityKey(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/gi, "i")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function compactAlphanum(value: string): string {
  return foldCityKey(value).replace(/[^a-z0-9]/g, "");
}

/** Kuzey Lefkoşa, Nicosia vb. tüm varyantlar tek şehir sayılır (canonical: lefkosa). */
export function isLefkosaAlias(value: string): boolean {
  if (!value?.trim()) return false;
  const folded = foldCityKey(value);
  const compact = compactAlphanum(value);

  if (compact === "lefkosa" || compact === "lefkosha") return true;
  if (folded === "nicosia" || folded === "north nicosia") return true;
  if (compact.includes("kuzey") && (compact.includes("lefko") || compact.includes("lefkos"))) return true;

  return false;
}

/** İlan kaydı için şehir slug'ı; bilinmeyen metin olduğu gibi döner. */
export function normalizeListingCitySlug(raw: string | null | undefined): string {
  if (raw == null) return "";
  const v = String(raw).trim();
  if (!v) return "";

  if (isLefkosaAlias(v)) return LEFKOSA_SLUG;

  for (const c of kktcCities) {
    if (!c.v) continue;
    if (c.v === v || c.l === v) return c.v;
    if (foldCityKey(c.l) === foldCityKey(v)) return c.v;
    if (compactAlphanum(c.l) === compactAlphanum(v)) return c.v;
    if (c.v.toLowerCase() === v.toLowerCase()) return c.v;
  }

  return v;
}

/** Supabase `.in('city', …)` — DB'deki eski yazımları da yakalar. */
export function expandListingCityFilterValues(slugOrRaw: string): string[] {
  const canonical = normalizeListingCitySlug(slugOrRaw);
  const base = slugOrRaw.trim();
  const label = kktcCities.find((c) => c.v === canonical)?.l;

  if (canonical === LEFKOSA_SLUG || isLefkosaAlias(base)) {
    const lefLabel = kktcCities.find((c) => c.v === LEFKOSA_SLUG)?.l ?? "Lefkoşa";
    return Array.from(
      new Set(
        [
          LEFKOSA_SLUG,
          lefLabel,
          "Lefkoşa",
          "Lefkosa",
          "Kuzey Lefkoşa",
          "Kuzey Lefkosa",
          "kuzey-lefkosa",
          "kuzey lefkosa",
          "North Nicosia",
          "Nicosia",
          "NICOSIA",
          base,
        ].filter(Boolean),
      ),
    );
  }

  return Array.from(new Set([canonical, base, label].filter((x): x is string => Boolean(x?.trim()))));
}

/**
 * Admin ilan listesi şehir filtresinde gösterilmeyecek değerler (ör. bölgenin şehir alanına yanlış yazılması).
 */
export function excludeFromAdminListingCityFilter(raw: string | null | undefined): boolean {
  if (raw == null || !String(raw).trim()) return false;
  return foldCityKey(String(raw)) === foldCityKey("Bahçeler");
}

/** Arayüz / kart metni — slug veya ham DB değeri → Türkçe şehir adı (mümkünse). */
export function displayListingCity(raw: string | null | undefined): string {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return "";
  const slug = normalizeListingCitySlug(trimmed);
  const label = kktcCities.find((c) => c.v === slug)?.l;
  return label ?? trimmed;
}

export function displayListingRegionOrNeighborhood(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  
  const slug = trimmed.toLowerCase().replace(/_/g, "-");
  
  for (const regionList of Object.values(kktcRegions)) {
    const match = regionList.find((r) => r.v === slug);
    if (match) return match.l;
  }
  
  return trimmed
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .map((word) => {
      if (!word) return "";
      return word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1).toLocaleLowerCase("tr-TR");
    })
    .join(" ");
}
