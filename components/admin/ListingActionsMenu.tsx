"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteListing, setListingPublishStatus } from "@/app/karealfaadmin/actions";

type Props = {
  listingId: string;
  status: string;
  statusLabel: string;
  editHref: string;
  labels: {
    publish: string;
    unpublish: string;
    edit: string;
    delete: string;
    confirmDelete: string;
    loading: string;
  };
};

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  DRAFT: "bg-zinc-100 text-zinc-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800",
  HIDDEN: "bg-zinc-200 text-zinc-600",
  REJECTED: "bg-rose-100 text-rose-700",
};

export function ListingActionsMenu({ listingId, status, statusLabel, editHref, labels }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isPublished = status === "PUBLISHED";

  function togglePublish() {
    setOpen(false);
    startTransition(async () => {
      await setListingPublishStatus(listingId, isPublished ? "DRAFT" : "PUBLISHED");
      router.refresh();
    });
  }

  function onEdit() {
    setOpen(false);
    router.push(editHref);
  }

  function onDelete() {
    setOpen(false);
    if (!window.confirm(labels.confirmDelete)) return;
    startTransition(() => {
      void deleteListing(listingId);
    });
  }

  const badgeClass = STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-700";

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${badgeClass}`}
      >
        {pending ? labels.loading : statusLabel}
        <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={`transition ${open ? "rotate-180" : ""}`}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={togglePublish}
            className="block w-full px-3 py-2 text-left text-sm font-medium text-emerald-700 hover:bg-emerald-50"
          >
            {isPublished ? labels.unpublish : labels.publish}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="block w-full px-3 py-2 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            {labels.edit}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="block w-full px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            {labels.delete}
          </button>
        </div>
      ) : null}
    </div>
  );
}
