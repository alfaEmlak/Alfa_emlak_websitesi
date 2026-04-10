import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [total, published, draft, featured, recent] = await Promise.all([
    prisma.listing.count(),
    prisma.listing.count({ where: { publishStatus: "PUBLISHED" } }),
    prisma.listing.count({ where: { publishStatus: "DRAFT" } }),
    prisma.listing.count({ where: { badgeFeatured: true } }),
    prisma.listing.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, listingId: true, title: true, publishStatus: true, createdAt: true, price: true, currency: true },
    }),
  ]);

  const cards = [
    { label: "Toplam ilan", value: total },
    { label: "Yayında", value: published },
    { label: "Taslak", value: draft },
    { label: "Öne çıkan", value: featured },
  ];

  return (
    <div className="p-6 lg:p-10">
      <h1 className="admin-page-title text-3xl font-extrabold">Özet</h1>
      <p className="mt-1 text-sm text-[var(--on-surface)]/55">İlan sayıları ve son eklenenler</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="admin-card p-5">
            <p className="label-sm text-[var(--on-surface)]/45">{c.label}</p>
            <p className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-[var(--primary)]">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-headline text-lg font-bold text-[var(--primary)]">Son eklenen ilanlar</h2>
          <Link href="/admin/ilanlar" className="text-sm font-semibold text-[var(--secondary)] hover:underline">
            Tümü
          </Link>
        </div>
        <div className="admin-card mt-4 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--ghost-outline)] bg-[var(--surface-container-low)]/80 text-xs font-semibold uppercase tracking-wide text-[var(--primary)]/55">
              <tr>
                <th className="px-4 py-3">İlan ID</th>
                <th className="px-4 py-3">Başlık</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Fiyat</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ghost-outline)] bg-[var(--surface-container-lowest)]">
              {recent.map((r) => (
                <tr key={r.id} className="transition hover:bg-[var(--surface-container-low)]/50">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--on-surface)]/70">{r.listingId}</td>
                  <td className="max-w-xs truncate px-4 py-3 font-medium text-[var(--on-surface)]">{r.title}</td>
                  <td className="px-4 py-3 text-[var(--on-surface)]/70">{r.publishStatus}</td>
                  <td className="px-4 py-3 tabular-nums text-[var(--on-surface)]">
                    {r.price.toLocaleString("tr-TR")} {r.currency}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/ilanlar/${r.id}/duzenle`}
                      className="font-semibold text-[var(--secondary)] hover:underline"
                    >
                      Düzenle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
