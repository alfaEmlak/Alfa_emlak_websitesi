import { displayListingCity } from "@/lib/listing-city";
import { SHOWCASE_MAX_PUBLISHED_FEATURED } from "@/lib/showcase-featured";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { requireAdmin } from "@/lib/panel-auth";
import { FeaturedToggleList } from "./FeaturedToggleList";

export default async function VitrinPage() {
  await requireAdmin();
  const { data: listings } = await supabaseAdmin
    .from("listings")
    .select("id, listing_id, title, price, currency, city, region, cover_image, badges, publish_status")
    .eq("publish_status", "PUBLISHED")
    .order("created_at", { ascending: false });

  const items = (listings || []).map((l) => {
    let isFeatured = false;
    try {
      const badges = typeof l.badges === "string" ? JSON.parse(l.badges) : (l.badges || {});
      isFeatured = !!badges.featured;
    } catch { /* ignore */ }

    return {
      id: l.id,
      listingId: l.listing_id,
      title: l.title,
      price: l.price,
      currency: l.currency,
      city: displayListingCity(l.city ?? ""),
      region: l.region,
      coverImage: l.cover_image,
      isFeatured,
    };
  });

  const featuredCount = items.filter((i) => i.isFeatured).length;

  return (
    <div className="p-6 lg:p-10">
      <div className="flex items-center gap-4">
        <h1 className="admin-page-title text-3xl font-extrabold">Vitrin İlanları</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
          <AdminIcon name="star" size={14} />
          {featuredCount} öne çıkan
        </span>
      </div>
      <p className="mt-1 text-sm text-(--on-surface)/55">
        Ana sayfada öne çıkacak ilanları buradan seçin. Yıldız açık olan ilanlar vitrine çıkar. Yayında en fazla{" "}
        {SHOWCASE_MAX_PUBLISHED_FEATURED} ilan vitrinde tutulabilir.
      </p>

      {items.length === 0 ? (
        <div className="admin-card mt-8 flex flex-col items-center justify-center p-16 text-center">
          <AdminIcon name="apartment" size={48} className="text-(--on-surface)/20" />
          <p className="mt-4 text-lg font-semibold text-(--on-surface)/40">Yayında ilan yok</p>
          <p className="mt-1 text-sm text-(--on-surface)/30">
            Önce ilan ekleyip yayına alın, ardından buradan vitrine çıkarabilirsiniz.
          </p>
        </div>
      ) : (
        <FeaturedToggleList items={items} />
      )}
    </div>
  );
}
