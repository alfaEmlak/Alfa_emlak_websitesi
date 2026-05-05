import { ListingEditor } from "@/components/admin/ListingEditor";
import { suggestListingId } from "@/app/karealfaadmin/actions";
import { requirePanelUser } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadFeedLookups } from "@/lib/feeds/lookups";
import { getDefaultConsultant, getSiteSettingsOrFallback } from "@/lib/site-settings";

export default async function NewListingPage() {
  const user = await requirePanelUser();
  const id = await suggestListingId();

  const [{ data: agents }, lookups, meResult] = await Promise.all([
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
        listing={null}
        suggestedId={id}
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
