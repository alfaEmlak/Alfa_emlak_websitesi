import Link from "next/link";
import { requireAdmin } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { displayListingCity } from "@/lib/listing-city";
import { TrashActions, type TrashRow } from "@/components/admin/TrashActions";

export const dynamic = "force-dynamic";

/**
 * Toplu silinen ilanlar burada bekler. Kayıtlar HIDDEN durumda ve feed
 * bayrakları kapalı olduğu için site, portallar ve vitrin bunları görmez.
 */
export default async function ListingTrashPage() {
  await requireAdmin();

  const { data } = await supabaseAdmin
    .from("listings")
    .select("id, listing_id, title, city, region, deleted_at, deleted_by_name, status_before_delete")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .limit(500);

  const rows = ((data ?? []) as TrashRow[]).map((r) => ({
    ...r,
    city: displayListingCity(r.city),
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Çöp kutusu</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Toplu silinen ilanlar (en yeni üstte, son 500 kayıt). Geri yüklenen ilan silinmeden önceki
            yayın durumuna döner.
          </p>
        </div>
        <Link
          href="/karealfaadmin/ilanlar"
          className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          İlanlara dön
        </Link>
      </div>

      <TrashActions rows={rows} />
    </div>
  );
}
