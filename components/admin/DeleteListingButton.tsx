"use client";

import { deleteListing } from "@/app/karealfaadmin/actions";
import { useTransition } from "react";

type Props = {
  listingId: string;
  label: string;
  confirmMessage: string;
  pendingLabel: string;
};

export function DeleteListingButton({ listingId, label, confirmMessage, pendingLabel }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="font-semibold text-rose-600 hover:underline disabled:opacity-50"
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(() => {
          void deleteListing(listingId);
        });
      }}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
