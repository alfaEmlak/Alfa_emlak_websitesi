import { notFound } from "next/navigation";
import { ListingEditor } from "@/components/admin/ListingEditor";
import { suggestListingId } from "@/app/karealfaadmin/actions";
import { requirePanelUser } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeListing } from "@/lib/listing-normalize";
import { isUuidString } from "@/lib/listing-identity";
import { loadFeedLookups } from "@/lib/feeds/lookups";
import { getDefaultConsultant, getSiteSettingsOrFallback } from "@/lib/site-settings";

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

  if (user.role === "CONSULTANT") {
    if (!user.agentId) notFound();
    const ownerId =
      typeof (listingRaw as { created_by_agent_id?: unknown }).created_by_agent_id === "string"
        ? (listingRaw as { created_by_agent_id: string }).created_by_agent_id
        : null;
    if (ownerId !== user.agentId) notFound();
  }

  const listing = normalizeListing(listingRaw);
  const [suggested, { data: agents }, lookups, meResult] = await Promise.all([
    suggestListingId(),
    supabaseAdmin
      .from("agents")
      .select("id, name, email, phone, photo, title, is_active")
      .eq("is_active", true)
      .order("name"),
    loadFeedLookups(),
    user.role === "CONSULTANT" && user.agentId
      ? supabaseAdmin.from("agents").select("id, name, email, phone, photo").eq("id", user.agentId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const settings = await getSiteSettingsOrFallback();
  const defaultConsultant = getDefaultConsultant(settings);
  const fixedOfficeName = defaultConsultant.office?.trim() || "ALFA EMLAK";
  const fixedOfficeLogo = defaultConsultant.logo?.trim() || "/alfa-3d.png";
  const lockedConsultant = meResult?.data
    ? {
        id: meResult.data.id as string,
        name: meResult.data.name as string,
        email: meResult.data.email as string,
        phone: (meResult.data.phone as string | null) ?? "",
        photo: (meResult.data.photo as string | null) ?? "",
      }
    : null;

  return (
    <div className="p-6 lg:p-10">
      <ListingEditor
        listing={listing}
        suggestedId={suggested}
        agents={agents || []}
        viewerRole={user.role}
        lookups={lookups}
        fixedOfficeName={fixedOfficeName}
        fixedOfficeLogo={fixedOfficeLogo}
        lockedConsultant={lockedConsultant}
      />
    </div>
  );
}
