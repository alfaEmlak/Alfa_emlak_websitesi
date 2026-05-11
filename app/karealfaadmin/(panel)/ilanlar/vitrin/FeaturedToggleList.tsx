"use client";

import { useState, useTransition } from "react";
import { toggleFeatured } from "@/app/karealfaadmin/actions";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { SHOWCASE_MAX_PUBLISHED_FEATURED } from "@/lib/showcase-featured";

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleToggle(id: string, current: boolean) {
    setErrorMsg(null);
    const nextFeatured = !current;
    if (nextFeatured && !current) {
      const n = items.filter((i) => i.isFeatured).length;
      if (n >= SHOWCASE_MAX_PUBLISHED_FEATURED) return;
    }
    setPendingId(id);
    startTransition(async () => {
      try {
        await toggleFeatured(id, nextFeatured);
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, isFeatured: nextFeatured } : item
          ),
        );
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "İşlem yapılamadı.");
      } finally {
        setPendingId(null);
      }
    });
  }

  const featuredItems = items.filter((i) => i.isFeatured);
  const otherItems = items.filter((i) => !i.isFeatured);

  const atCapacity = featuredItems.length >= SHOWCASE_MAX_PUBLISHED_FEATURED;

  return (
    <div className="mt-8 space-y-8">
      {errorMsg ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{errorMsg}</div>
      ) : null}
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
                addBlocked={false}
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
                addBlocked={atCapacity}
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
  addBlocked,
}: {
  item: Item;
  isPending: boolean;
  onToggle: (id: string, current: boolean) => void;
  addBlocked: boolean;
}) {
  const disableAdd = !item.isFeatured && addBlocked;

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
        type="button"
        onClick={() => {
          if (disableAdd) return;
          onToggle(item.id, item.isFeatured);
        }}
        disabled={isPending || disableAdd}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
          disableAdd ? "cursor-not-allowed" : "cursor-pointer"
        } ${item.isFeatured ? "bg-purple-500" : "bg-(--on-surface)/20"}`}
        title={
          disableAdd
            ? `Vitrinde en fazla ${SHOWCASE_MAX_PUBLISHED_FEATURED} ilan olabilir`
            : item.isFeatured
              ? "Vitrinden kaldır"
              : "Vitrine ekle"
        }
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
