import { notFound } from "next/navigation";
import { ListingEditor } from "@/components/admin/ListingEditor";
import { suggestListingId } from "@/app/karealfaadmin/actions";
import { requirePanelUser } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeListing } from "@/lib/listing-normalize";

type Props = { params: Promise<{ id: string }> };

export default async function EditListingPage({ params }: Props) {
  const user = await requirePanelUser();
  const { id } = await params;
  const { data: listingRaw, error } = await supabaseAdmin
    .from("listings")
    .select("*, listing_images(*)")
    .eq("id", id)
    .single();

  if (error || !listingRaw) notFound();
  
  const listing = normalizeListing(listingRaw);
  const suggested = await suggestListingId();

  const { data: agents } = await supabaseAdmin
    .from("agents")
    .select("id, name, email, phone, photo, title, is_active")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="p-6 lg:p-10">
      <ListingEditor listing={listing} suggestedId={suggested} agents={agents || []} viewerRole={user.role} />
    </div>
  );
}
