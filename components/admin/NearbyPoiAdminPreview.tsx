"use client";

import { useEffect, useMemo, useState } from "react";
import type { NearbyPoiCategoryId } from "@/lib/nearby-poi";
import type { NearbyPoiRow } from "@/lib/osm-nearby";

type Props = {
  lat: number | null;
  lng: number | null;
  categories: Record<NearbyPoiCategoryId, boolean>;
};

export function NearbyPoiAdminPreview({ lat, lng, categories }: Props) {
  const [rows, setRows] = useState<NearbyPoiRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const categoriesKey = useMemo(() => JSON.stringify(categories), [categories]);

  useEffect(() => {
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setRows(null);
      setErr(null);
      return;
    }

    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/nearby-pois", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat, lng, categories }),
          });
          const data = (await res.json()) as { rows?: NearbyPoiRow[]; error?: string };
          if (!res.ok) {
            setErr(data.error ?? "Önizleme alınamadı");
            setRows([]);
            return;
          }
          setErr(null);
          setRows(data.rows ?? []);
        } catch {
          setErr("Bağlantı hatası");
          setRows([]);
        }
      })();
    }, 450);

    return () => window.clearTimeout(handle);
  }, [lat, lng, categoriesKey]);

  if (lat == null || lng == null) {
    return (
      <p className="mt-2 text-sm text-[var(--on-surface)]/55">
        Önizleme için Özellikler bölümünden geçerli harita koordinatları girin.
      </p>
    );
  }

  if (err) {
    return <p className="mt-2 text-sm text-amber-800">{err}</p>;
  }

  if (rows === null) {
    return <p className="mt-2 text-sm text-[var(--on-surface)]/55">Önizleme yükleniyor…</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="mt-2 text-sm text-[var(--on-surface)]/55">
        Bu konum için OSM verisinde sonuç bulunamadı. Farklı koordinat veya daha yoğun bir bölge deneyin.
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-2 text-sm">
      {rows.map((r) => (
        <li
          key={r.categoryId}
          className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2"
        >
          <span className="text-[var(--on-surface)]">
            <span className="font-semibold text-[var(--primary)]">{r.categoryLabel}</span>
            <span className="text-[var(--on-surface)]/80"> — {r.name}</span>
          </span>
          <span className="shrink-0 tabular-nums text-[var(--on-surface)]/55">{r.distanceLabel}</span>
        </li>
      ))}
    </ul>
  );
}
