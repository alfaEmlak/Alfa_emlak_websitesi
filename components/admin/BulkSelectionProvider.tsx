"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { AdminListingFilter, BulkTarget } from "@/components/admin/bulk-types";

/**
 * İlan listesindeki çoklu seçimin durumu.
 *
 * İki kip var:
 * - "selection": kullanıcının tek tek işaretlediği id'ler.
 * - "filter": "filtreye uyan tüm ilanlar" — id listesi taşımak yerine filtrenin
 *   kendisi sunucuya gider, hedefler orada yeniden çözülür.
 */

type BulkSelectionValue = {
  selectedIds: Set<string>;
  /** Filtreye uyan tüm ilanlar seçili mi. */
  allMatchingSelected: boolean;
  /** İşlem görecek ilan sayısı. */
  count: number;
  /** Sayfadaki id'ler (başlıktaki "tümünü seç" için). */
  pageIds: string[];
  /** Filtreye uyan toplam ilan sayısı. */
  filteredCount: number;
  filter: AdminListingFilter;
  toggleOne: (id: string) => void;
  togglePage: () => void;
  selectAllMatching: () => void;
  clear: () => void;
  /** Sunucuya gönderilecek hedef tanımı. */
  buildTarget: () => BulkTarget;
};

const BulkSelectionContext = createContext<BulkSelectionValue | null>(null);

export function useBulkSelection(): BulkSelectionValue {
  const ctx = useContext(BulkSelectionContext);
  if (!ctx) throw new Error("useBulkSelection, BulkSelectionProvider içinde kullanılmalı");
  return ctx;
}

export function BulkSelectionProvider({
  pageIds,
  filteredCount,
  filter,
  children,
}: {
  pageIds: string[];
  filteredCount: number;
  filter: AdminListingFilter;
  children: ReactNode;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allMatchingSelected, setAllMatchingSelected] = useState(false);

  const toggleOne = useCallback((id: string) => {
    // Tek tek işaretleme "tümü" kipinden çıkarır — kapsam belirsiz kalmasın.
    setAllMatchingSelected(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePage = useCallback(() => {
    setAllMatchingSelected(false);
    setSelectedIds((prev) => {
      const allOnPage = pageIds.length > 0 && pageIds.every((id) => prev.has(id));
      const next = new Set(prev);
      for (const id of pageIds) {
        if (allOnPage) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, [pageIds]);

  const selectAllMatching = useCallback(() => {
    setAllMatchingSelected(true);
    setSelectedIds(new Set(pageIds));
  }, [pageIds]);

  const clear = useCallback(() => {
    setAllMatchingSelected(false);
    setSelectedIds(new Set());
  }, []);

  const value = useMemo<BulkSelectionValue>(() => {
    const count = allMatchingSelected ? filteredCount : selectedIds.size;
    return {
      selectedIds,
      allMatchingSelected,
      count,
      pageIds,
      filteredCount,
      filter,
      toggleOne,
      togglePage,
      selectAllMatching,
      clear,
      buildTarget: () =>
        allMatchingSelected
          ? { mode: "filter", filter }
          : { mode: "ids", ids: [...selectedIds] },
    };
  }, [
    selectedIds,
    allMatchingSelected,
    filteredCount,
    filter,
    pageIds,
    toggleOne,
    togglePage,
    selectAllMatching,
    clear,
  ]);

  return <BulkSelectionContext.Provider value={value}>{children}</BulkSelectionContext.Provider>;
}

/** Satır başındaki seçim kutusu. */
export function BulkRowCheckbox({ id, label }: { id: string; label: string }) {
  const { selectedIds, toggleOne } = useBulkSelection();
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={selectedIds.has(id)}
      onChange={() => toggleOne(id)}
      className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
    />
  );
}

/** Tablo başlığındaki "sayfadaki tümünü seç" kutusu. */
export function BulkHeaderCheckbox({ label }: { label: string }) {
  const { selectedIds, pageIds, togglePage } = useBulkSelection();
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someOnPage = pageIds.some((id) => selectedIds.has(id));
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={allOnPage}
      ref={(el) => {
        if (el) el.indeterminate = !allOnPage && someOnPage;
      }}
      onChange={togglePage}
      className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500"
    />
  );
}
