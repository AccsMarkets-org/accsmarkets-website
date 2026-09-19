import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { EditListingForm } from "@/components/listings/EditListingForm";
import { PrivateListingInvites } from "@/components/listings/PrivateListingInvites";

export default async function EditListingPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const listing = await prisma.listing.findUnique({ where: { id: params.id } });

  if (!listing || listing.sellerId !== session!.user.id) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-8">
      <div>
        <h1 className="text-2xl font-black text-foreground">Edit listing</h1>
        <p className="mt-0.5 text-sm text-muted">Update your listing details — saving resubmits for admin review.</p>
      </div>
      <Card>
        <EditListingForm listing={listing} />
      </Card>
      {listing.isPrivate && (
        <Card>
          <PrivateListingInvites listingId={listing.id} />
        </Card>
      )}
    </div>
  );
}
