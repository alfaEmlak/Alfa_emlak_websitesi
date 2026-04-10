import { notFound } from "next/navigation";
import { ListingEditor } from "@/components/admin/ListingEditor";
import { suggestListingId } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function EditListingPage({ params }: Props) {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { images: true },
  });
  if (!listing) notFound();
  const suggested = await suggestListingId();
  return (
    <div className="p-6 lg:p-10">
      <ListingEditor listing={listing} suggestedId={suggested} />
    </div>
  );
}
