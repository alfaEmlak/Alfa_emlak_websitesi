"use client";

import { useState } from "react";
import { useBulkSelection } from "@/components/admin/BulkSelectionProvider";
import { BulkActionsDrawer, type BulkDrawerLabels, type BulkDrawerOptions } from "@/components/admin/BulkActionsDrawer";

export type BulkBarLabels = {
  selectedCount: string;
  selectAllMatching: string;
  clear: string;
  openDrawer: string;
  allMatchingActive: string;
};

/**
 * Seçim yapıldığında alttan çıkan çubuk. Yalnızca kapsamı özetler ve yan
 * paneli açar; işlemlerin kendisi drawer'da.
 */
export function BulkActionsBar({
  labels,
  drawerLabels,
  options,
}: {
  labels: BulkBarLabels;
  drawerLabels: BulkDrawerLabels;
  options: BulkDrawerOptions;
}) {
  const { count, selectedIds, allMatchingSelected, filteredCount, selectAllMatching, clear } = useBulkSelection();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (count === 0) return null;

  // Sayfadaki tüm satırlar seçiliyken ve filtrede daha fazlası varken teklif edilir.
  const canOfferAllMatching = !allMatchingSelected && filteredCount > selectedIds.size;

  return (
    <>
      <div className="sticky bottom-0 z-30 -mx-4 mt-4 border-t border-zinc-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-sm font-semibold text-zinc-800">
            {labels.selectedCount.replace("{count}", count.toLocaleString("tr-TR"))}
          </span>

          {allMatchingSelected ? (
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              {labels.allMatchingActive}
            </span>
          ) : canOfferAllMatching ? (
            <button
              type="button"
              onClick={selectAllMatching}
              className="text-sm font-semibold text-emerald-700 underline underline-offset-2 transition hover:text-emerald-800"
            >
              {labels.selectAllMatching.replace("{count}", filteredCount.toLocaleString("tr-TR"))}
            </button>
          ) : null}

          <button
            type="button"
            onClick={clear}
            className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            {labels.clear}
          </button>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="ml-auto inline-flex min-h-[44px] items-center justify-center rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
          >
            {labels.openDrawer}
          </button>
        </div>
      </div>

      {/* Koşullu render: panel kapandığında bileşen sökülür, böylece bir sonraki
          açılışta form ve sonuç mesajı temiz başlar. */}
      {drawerOpen ? (
        <BulkActionsDrawer onClose={() => setDrawerOpen(false)} labels={drawerLabels} options={options} />
      ) : null}
    </>
  );
}
