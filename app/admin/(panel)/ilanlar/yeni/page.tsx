import { ListingEditor } from "@/components/admin/ListingEditor";
import { suggestListingId } from "@/app/admin/actions";

export default async function NewListingPage() {
  const id = await suggestListingId();
  return (
    <div className="p-6 lg:p-10">
      <ListingEditor listing={null} suggestedId={id} />
    </div>
  );
}
