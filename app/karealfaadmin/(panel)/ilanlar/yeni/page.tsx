import { ListingEditor } from "@/components/admin/ListingEditor";
import { suggestListingId } from "@/app/karealfaadmin/actions";
import { requirePanelUser } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loadFeedLookups } from "@/lib/feeds/lookups";

export default async function NewListingPage() {
  const user = await requirePanelUser();
  const id = await suggestListingId();

  const [{ data: agents }, lookups] = await Promise.all([
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
        listing={null}
        suggestedId={id}
        agents={agents || []}
        viewerRole={user.role}
        lookups={lookups}
      />
    </div>
  );
}
