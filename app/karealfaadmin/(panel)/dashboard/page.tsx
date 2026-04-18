import Link from "next/link";
import { AdminIcon, type AdminIconName } from "@/components/admin/AdminIcon";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function AdminDashboardPage() {
  // Get all counts in parallel
  const [
    { count: total },
    { count: published },
    { count: draft },
    { count: featured },
    { data: recent },
    { count: unreadMessages },
    { count: totalMessages },
    { count: blogCount },
    { count: agentCount },
  ] = await Promise.all([
    supabaseAdmin.from("listings").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("listings").select("*", { count: "exact", head: true }).eq("publish_status", "PUBLISHED"),
    supabaseAdmin.from("listings").select("*", { count: "exact", head: true }).eq("publish_status", "DRAFT"),
    supabaseAdmin.from("listings").select("*", { count: "exact", head: true }).contains("badges", { featured: true }),
    supabaseAdmin
      .from("listings")
      .select("id, listing_id, title, publish_status, created_at, price, currency")
      .order("created_at", { ascending: false })
      .limit(6),
    supabaseAdmin.from("contact_messages").select("*", { count: "exact", head: true }).eq("is_read", false),
    supabaseAdmin.from("contact_messages").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("blog_posts").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("agents").select("*", { count: "exact", head: true }),
  ]);

  const { data: recentMessages } = await supabaseAdmin
    .from("contact_messages")
    .select("id, name, subject, is_read, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const cards: Array<{ label: string; value: number; icon: AdminIconName; color: string; bg: string }> = [
    { label: "Toplam ilan", value: total || 0, icon: "apartment", color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Yayında", value: published || 0, icon: "check_circle", color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Taslak", value: draft || 0, icon: "edit_note", color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Öne çıkan", value: featured || 0, icon: "star", color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Okunmamış mesaj", value: unreadMessages || 0, icon: "mail", color: "text-red-600", bg: "bg-red-50" },
    { label: "Toplam mesaj", value: totalMessages || 0, icon: "forum", color: "text-sky-600", bg: "bg-sky-50" },
    { label: "Blog yazısı", value: blogCount || 0, icon: "article", color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Danışman", value: agentCount || 0, icon: "group", color: "text-teal-600", bg: "bg-teal-50" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <h1 className="admin-page-title text-2xl font-extrabold sm:text-3xl">Özet</h1>
      <p className="mt-1 text-sm text-(--on-surface)/55">Genel bakış ve son aktiviteler</p>

      {/* Stat Cards */}
      <div className="mt-6 grid gap-3 grid-cols-2 sm:mt-8 sm:gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="admin-card flex items-center gap-3 p-3 sm:gap-4 sm:p-5">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${c.bg}`}>
              <AdminIcon name={c.icon} size={20} className={c.color} />
            </div>
            <div className="min-w-0">
              <p className="label-sm truncate text-(--on-surface)/45">{c.label}</p>
              <p className="mt-0.5 font-headline text-xl font-extrabold tracking-tight text-(--primary) sm:text-2xl">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 sm:mt-10 lg:grid-cols-2">
        {/* Recent Listings */}
        <div>
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-headline text-lg font-bold text-(--primary)">Son eklenen ilanlar</h2>
            <Link href="/karealfaadmin/ilanlar" className="text-sm font-semibold text-(--secondary) hover:underline">
              Tümü
            </Link>
          </div>
          <div className="admin-card mt-4 overflow-x-auto overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-(--ghost-outline) bg-(--surface-container-low)/80 text-xs font-semibold uppercase tracking-wide text-(--primary)/55">
                <tr>
                  <th className="px-4 py-3">İlan ID</th>
                  <th className="px-4 py-3">Başlık</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Fiyat</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-(--ghost-outline) bg-surface-lowest">
                {recent && recent.length > 0 ? recent.map((r) => (
                  <tr key={r.id} className="transition hover:bg-(--surface-container-low)/50">
                    <td className="px-4 py-3 font-mono text-xs text-(--on-surface)/70">{r.listing_id}</td>
                    <td className="max-w-40 truncate px-4 py-3 font-medium text-on-surface">{r.title}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        r.publish_status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {r.publish_status === "PUBLISHED" ? "Yayında" : "Taslak"}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-on-surface">
                      {r.price.toLocaleString("tr-TR")} {r.currency}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/karealfaadmin/ilanlar/${r.id}/duzenle`}
                        className="font-semibold text-(--secondary) hover:underline"
                      >
                        Düzenle
                      </Link>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-(--on-surface)/50">
                      Henüz ilan yok
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Messages */}
        <div>
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-headline text-lg font-bold text-(--primary)">Son gelen mesajlar</h2>
            <Link href="/karealfaadmin/mesajlar" className="text-sm font-semibold text-(--secondary) hover:underline">
              Tümü
            </Link>
          </div>
          <div className="admin-card mt-4 divide-y divide-(--ghost-outline) overflow-hidden">
            {(!recentMessages || recentMessages.length === 0) ? (
              <div className="flex flex-col items-center justify-center p-10 text-center">
                <AdminIcon name="inbox" size={30} className="text-(--on-surface)/15" />
                <p className="mt-2 text-sm text-(--on-surface)/35">Henüz mesaj yok</p>
              </div>
            ) : (
              recentMessages.map((m) => (
                <Link
                  key={m.id}
                  href="/karealfaadmin/mesajlar"
                  className={`flex items-center gap-3 px-5 py-3.5 transition hover:bg-(--surface-container-low)/50 ${
                    !m.is_read ? "bg-blue-50/30" : ""
                  }`}
                >
                  <AdminIcon
                    name={m.is_read ? "drafts" : "mail"}
                    size={18}
                    className={!m.is_read ? "text-(--secondary)" : "text-(--on-surface)/25"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-on-surface">{m.name}</p>
                    {m.subject && (
                      <p className="truncate text-xs text-(--on-surface)/50">{m.subject}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] tabular-nums text-(--on-surface)/35">
                    {new Date(m.created_at).toLocaleDateString("tr-TR")}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
