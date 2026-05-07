import { parseOwnerContactPrivate } from "@/lib/owner-contact-private";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type ListingOwnerDocsRow = {
  id: string;
  listingId: string;
  title: string;
  publishStatus: string;
  documentUrls: string[];
};

type RawRow = {
  id: string;
  listing_id: string;
  title: string | null;
  publish_status: string | null;
  detail_fields: unknown;
};

/**
 * Yalnızca en az bir köçan/belge URL’si olan ilanlar (panelde toplu görünüm).
 */
export async function fetchListingsWithOwnerDocuments(): Promise<ListingOwnerDocsRow[]> {
  const pageSize = 500;
  let from = 0;
  const out: ListingOwnerDocsRow[] = [];

  for (;;) {
    const { data, error } = await supabaseAdmin
      .from("listings")
      .select("id, listing_id, title, publish_status, detail_fields")
      .order("updated_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("[fetchListingsWithOwnerDocuments]", error.message);
      break;
    }

    const rows = (data ?? []) as RawRow[];
    if (!rows.length) break;

    for (const r of rows) {
      const documentUrls = parseOwnerContactPrivate(r.detail_fields).documentUrls;
      if (!documentUrls.length) continue;
      out.push({
        id: r.id,
        listingId: r.listing_id,
        title: (r.title ?? "").trim() || r.listing_id,
        publishStatus: (r.publish_status ?? "").trim() || "DRAFT",
        documentUrls,
      });
    }

    if (rows.length < pageSize) break;
    from += pageSize;
    if (from > 50_000) break;
  }

  return out;
}
