"use client";

import { useState, useTransition } from "react";
import { toggleFeatured } from "@/app/karealfaadmin/actions";
import { AdminIcon } from "@/components/admin/AdminIcon";

type Item = {
  id: string;
  listingId: string;
  title: string;
  price: number;
  currency: string;
  city: string | null;
  region: string | null;
  coverImage: string | null;
  isFeatured: boolean;
};

export function FeaturedToggleList({ items: initial }: { items: Item[] }) {
  const [items, setItems] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  function handleToggle(id: string, current: boolean) {
    setPendingId(id);
    startTransition(async () => {
      await toggleFeatured(id, !current);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, isFeatured: !current } : item
        )
      );
      setPendingId(null);
    });
  }

  const featuredItems = items.filter((i) => i.isFeatured);
  const otherItems = items.filter((i) => !i.isFeatured);

  return (
    <div className="mt-8 space-y-8">
      {/* Featured section */}
      {featuredItems.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-purple-700">
            <AdminIcon name="star" size={16} />
            Vitrindeki ilanlar ({featuredItems.length})
          </h2>
          <div className="admin-card divide-y divide-(--ghost-outline) overflow-hidden">
            {featuredItems.map((item) => (
              <ListingRow
                key={item.id}
                item={item}
                isPending={isPending && pendingId === item.id}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other listings */}
      {otherItems.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-(--on-surface)/50">
            <AdminIcon name="apartment" size={16} />
            Diğer yayındaki ilanlar ({otherItems.length})
          </h2>
          <div className="admin-card divide-y divide-(--ghost-outline) overflow-hidden">
            {otherItems.map((item) => (
              <ListingRow
                key={item.id}
                item={item}
                isPending={isPending && pendingId === item.id}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ListingRow({
  item,
  isPending,
  onToggle,
}: {
  item: Item;
  isPending: boolean;
  onToggle: (id: string, current: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-(--surface-container-low)/50">
      {/* Cover image */}
      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-(--surface-container-low)">
        {item.coverImage ? (
          <img
            src={item.coverImage}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <AdminIcon name="image" size={20} className="text-(--on-surface)/20" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-(--on-surface)">{item.title}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-(--on-surface)/50">
          <span className="font-mono">{item.listingId}</span>
          {item.city && (
            <>
              <span>·</span>
              <span>{item.city}{item.region ? `, ${item.region}` : ""}</span>
            </>
          )}
        </div>
      </div>

      {/* Price */}
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold tabular-nums text-(--primary)">
          {item.price.toLocaleString("tr-TR")} {item.currency}
        </p>
      </div>

      {/* Toggle switch */}
      <button
        onClick={() => onToggle(item.id, item.isFeatured)}
        disabled={isPending}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
          item.isFeatured ? "bg-purple-500" : "bg-(--on-surface)/20"
        }`}
        title={item.isFeatured ? "Vitrinden kaldır" : "Vitrine ekle"}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
            item.isFeatured ? "translate-x-6" : "translate-x-1"
          }`}
        />
        {item.isFeatured && (
          <AdminIcon
            name="star"
            size={10}
            className="absolute left-1.5 text-white"
          />
        )}
      </button>
    </div>
  );
}
