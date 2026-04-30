import { notFound } from "next/navigation";
import { ListingEditor } from "@/components/admin/ListingEditor";
import { suggestListingId } from "@/app/karealfaadmin/actions";
import { requirePanelUser } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeListing } from "@/lib/listing-normalize";
import { isUuidString } from "@/lib/listing-identity";
import { loadFeedLookups } from "@/lib/feeds/lookups";

type Props = { params: Promise<{ id: string }> };

export default async function EditListingPage({ params }: Props) {
  const user = await requirePanelUser();
  const { id } = await params;
  const byId = isUuidString(id)
    ? await supabaseAdmin.from("listings").select("*, listing_images(*)").eq("id", id).maybeSingle()
    : { data: null, error: null };
  const byListingId = !byId.data && !byId.error
    ? await supabaseAdmin.from("listings").select("*, listing_images(*)").eq("listing_id", id).maybeSingle()
    : byId;
  const { data: listingRaw, error } = byId.data ? byId : byListingId;

  if (error || !listingRaw) notFound();

  const listing = normalizeListing(listingRaw);
  const [suggested, { data: agents }, lookups] = await Promise.all([
    suggestListingId(),
    supabaseAdmin
      .from("agents")
      .select("id, name, email, phone, photo, title, is_active")
      .eq("is_active", true)
      .order("name"),
    loadFeedLookups(),
  ]);

  return (
    <div className="p-6 lg:p-10">
      <ListingEditor
        listing={listing}
        suggestedId={suggested}
        agents={agents || []}
        viewerRole={user.role}
        lookups={lookups}
      />
    </div>
  );
}
