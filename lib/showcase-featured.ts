import { supabaseAdmin } from "@/lib/supabase/admin";

/** Ana sayfa vitrininde gösterilecek yayında “öne çıkan” ilan üst sınırı. */
export const SHOWCASE_MAX_PUBLISHED_FEATURED = 9;

/**
 * Yayında ve badges.featured olan ilan sayısı (isteğe bağlı olarak bir kayıt hariç).
 */
export async function countPublishedFeaturedExcluding(excludeListingId: string | null): Promise<number> {
  let q = supabaseAdmin
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("publish_status", "PUBLISHED")
    .contains("badges", { featured: true });

  if (excludeListingId) {
    q = q.neq("id", excludeListingId);
  }

  const { count, error } = await q;
  if (!error) return count ?? 0;

  let q2 = supabaseAdmin
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("publish_status", "PUBLISHED")
    .like("badges", '%"featured":true%');

  if (excludeListingId) {
    q2 = q2.neq("id", excludeListingId);
  }

  const { count: c2 } = await q2;
  return c2 ?? 0;
}
