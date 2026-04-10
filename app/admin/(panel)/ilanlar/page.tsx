import Image from "next/image";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { listingKindLabel, publishStatusLabel } from "@/lib/listing-kinds";
import { primaryImageUrl } from "@/lib/listing-utils";

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined) {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function AdminListingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const qId = first(sp.listingId)?.trim();
  const qTitle = first(sp.title)?.trim();
  const city = first(sp.city)?.trim();
  const kind = first(sp.kind)?.trim();
  const status = first(sp.status)?.trim();

  const where: Prisma.ListingWhereInput = {};
  if (qId) where.listingId = { contains: qId };
  if (qTitle) where.title = { contains: qTitle };
  if (city) where.city = { contains: city };
  if (kind && ["SATILIK", "KIRALIK", "GUNLUK_KIRALIK", "PROJE"].includes(kind)) where.kind = kind;
  if (status && ["DRAFT", "PUBLISHED", "HIDDEN"].includes(status)) where.publishStatus = status;

  const rows = await prisma.listing.findMany({
    where,
    include: { images: true },
    orderBy: { updatedAt: "desc" },
    take: 80,
  });

  return (
    <div className="p-6 lg:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="admin-page-title text-3xl font-extrabold">İlanlarınız</h1>
          <p className="text-sm text-[var(--on-surface)]/55">Listeyi filtreleyin; düzenlemek için satırdaki bağlantıyı kullanın.</p>
        </div>
        <Link
          href="/admin/ilanlar/yeni"
          className="btn-tactile inline-flex items-center justify-center rounded-xl bg-[var(--secondary)] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-[var(--secondary)]/25 transition hover:bg-[var(--brand-hover)]"
        >
          Yeni ilan
        </Link>
      </div>

      <form className="admin-card mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <input
          name="listingId"
          placeholder="İlan ID"
          defaultValue={qId ?? ""}
          className="rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/25"
        />
        <input
          name="title"
          placeholder="Başlık"
          defaultValue={qTitle ?? ""}
          className="rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/25"
        />
        <input
          name="city"
          placeholder="Şehir"
          defaultValue={city ?? ""}
          className="rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/25"
        />
        <select
          name="kind"
          defaultValue={kind ?? ""}
          className="rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/25"
        >
          <option value="">Tür (tümü)</option>
          <option value="SATILIK">Satılık</option>
          <option value="KIRALIK">Kiralık</option>
          <option value="GUNLUK_KIRALIK">Günlük</option>
          <option value="PROJE">Proje</option>
        </select>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/25"
        >
          <option value="">Durum (tümü)</option>
          <option value="PUBLISHED">Yayında</option>
          <option value="DRAFT">Taslak</option>
          <option value="HIDDEN">Gizli</option>
        </select>
        <button
          type="submit"
          className="btn-tactile rounded-xl bg-[var(--primary)] py-2 text-sm font-bold text-white transition hover:brightness-110"
        >
          Filtrele
        </button>
      </form>

      <div className="admin-card mt-6 overflow-auto">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="border-b border-[var(--ghost-outline)] bg-[var(--surface-container-low)]/80 text-xs font-semibold uppercase tracking-wide text-[var(--primary)]/55">
            <tr>
              <th className="px-3 py-3">Kapak</th>
              <th className="px-3 py-3">İlan ID</th>
              <th className="px-3 py-3">Başlık</th>
              <th className="px-3 py-3">Tür</th>
              <th className="px-3 py-3">Şehir / Bölge</th>
              <th className="px-3 py-3">Fiyat</th>
              <th className="px-3 py-3">Durum</th>
              <th className="px-3 py-3">Güncelleme</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ghost-outline)] bg-[var(--surface-container-lowest)]">
            {rows.map((r) => {
              const img = primaryImageUrl(r);
              const remote = img.startsWith("http");
              return (
                <tr key={r.id} className="transition hover:bg-[var(--surface-container-low)]/50">
                  <td className="px-3 py-2">
                    <div className="relative h-12 w-16 overflow-hidden rounded-lg bg-[var(--surface-container-low)] ring-1 ring-[var(--ghost-outline)]">
                      <Image src={img} alt="" fill className="object-cover" sizes="64px" unoptimized={remote} />
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-[var(--on-surface)]/70">{r.listingId}</td>
                  <td className="max-w-[200px] truncate px-3 py-2 font-medium text-[var(--on-surface)]">{r.title}</td>
                  <td className="px-3 py-2 text-[var(--on-surface)]/80">{listingKindLabel(r.kind)}</td>
                  <td className="px-3 py-2 text-xs text-[var(--on-surface)]/65">
                    {r.city} / {r.region}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{r.price.toLocaleString("tr-TR")} {r.currency}</td>
                  <td className="px-3 py-2">{publishStatusLabel(r.publishStatus)}</td>
                  <td className="px-3 py-2 text-xs text-[var(--on-surface)]/50">{r.updatedAt.toLocaleDateString("tr-TR")}</td>
                  <td className="px-3 py-2 text-right">
                    <Link href={`/admin/ilanlar/${r.id}/duzenle`} className="font-semibold text-[var(--secondary)] hover:underline">
                      Düzenle
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
