import Link from "next/link";
import { AdminIcon, type AdminIconName } from "@/components/admin/AdminIcon";
import { requirePanelUser } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type DashboardRow = {
  id: string;
  listing_id: string;
  title: string;
  publish_status: string;
  price: number;
  currency: string;
  updated_at?: string;
  created_by_name?: string | null;
};

const APPROVAL_STATUSES = ["PENDING_APPROVAL", "HIDDEN"] as const;

async function selectDashboardRows(
  user: { role: "ADMIN" | "CONSULTANT"; agentId: string | null },
  columns: string,
  limit: number,
  statuses?: readonly string[],
) {
  let query = supabaseAdmin.from("listings").select(columns);
  if (user.role !== "ADMIN" && user.agentId) {
    query = query.eq("created_by_agent_id", user.agentId);
  }
  if (statuses?.length) {
    query = query.in("publish_status", [...statuses]);
  }

  const primary = await query.order("updated_at", { ascending: false }).limit(limit);
  if (!primary.error) {
    return (primary.data ?? []) as unknown as DashboardRow[];
  }

  if (!primary.error.message.includes("Could not find the")) {
    return [];
  }

  let fallback = supabaseAdmin.from("listings").select("id, listing_id, title, publish_status, price, currency, updated_at");
  if (user.role !== "ADMIN" && user.agentId) {
    fallback = fallback.eq("created_by_agent_id", user.agentId);
  }
  if (statuses?.length) {
    fallback = fallback.in("publish_status", [...statuses]);
  }

  const secondary = await fallback.order("updated_at", { ascending: false }).limit(limit);
  return (secondary.data ?? []) as unknown as DashboardRow[];
}

export default async function AdminDashboardPage() {
  const user = await requirePanelUser();

  const listingsCountSource = () => {
    let query = supabaseAdmin.from("listings").select("*", { count: "exact", head: true });
    if (user.role !== "ADMIN" && user.agentId) {
      query = query.eq("created_by_agent_id", user.agentId);
    }
    return query;
  };

  const [
    { count: total },
    { count: published },
    { count: drafts },
    { count: pendingApproval },
    recentRows,
    pendingRows,
  ] = await Promise.all([
    listingsCountSource(),
    listingsCountSource().eq("publish_status", "PUBLISHED"),
    listingsCountSource().eq("publish_status", "DRAFT"),
    listingsCountSource().in("publish_status", [...APPROVAL_STATUSES]),
    selectDashboardRows(user, "id, listing_id, title, publish_status, price, currency, created_by_name, updated_at", 6),
    selectDashboardRows(user, "id, listing_id, title, publish_status, created_by_name, updated_at", 5, APPROVAL_STATUSES),
  ]);

  const cards: Array<{ label: string; value: number; icon: AdminIconName; color: string; bg: string }> = [
    { label: "Toplam ilan", value: total || 0, icon: "apartment", color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Yayinda", value: published || 0, icon: "check_circle", color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Taslak", value: drafts || 0, icon: "edit_note", color: "text-amber-600", bg: "bg-amber-50" },
    {
      label: user.role === "ADMIN" ? "Onay bekleyen" : "Gonderilenler",
      value: pendingApproval || 0,
      icon: "warning",
      color: "text-fuchsia-600",
      bg: "bg-fuchsia-50",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <h1 className="admin-page-title text-2xl font-extrabold sm:text-3xl">{user.role === "ADMIN" ? "Yonetim ozeti" : "Danisman ozeti"}</h1>
      <p className="mt-1 text-sm text-(--on-surface)/55">
        {user.role === "ADMIN" ? "Bekleyen ilan onaylari ve son aktiviteler" : "Kendi ilanlarinizin durumu ve admin onay sureci"}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="admin-card flex items-center gap-3 p-3 sm:gap-4 sm:p-5">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${card.bg}`}>
              <AdminIcon name={card.icon} size={20} className={card.color} />
            </div>
            <div className="min-w-0">
              <p className="label-sm truncate text-(--on-surface)/45">{card.label}</p>
              <p className="mt-0.5 font-headline text-xl font-extrabold tracking-tight text-(--primary) sm:text-2xl">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="admin-card overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-(--ghost-outline) px-5 py-4">
            <div>
              <h2 className="font-headline text-lg font-bold text-(--primary)">Son ilan hareketleri</h2>
              <p className="text-xs text-(--on-surface)/50">Yeni eklenen ve guncellenen kayitlar</p>
            </div>
            <Link href="/karealfaadmin/ilanlar" className="text-sm font-semibold text-(--secondary) hover:underline">
              Tumu
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-(--surface-container-low)/80 text-xs font-semibold uppercase tracking-wide text-(--primary)/55">
                <tr>
                  <th className="px-4 py-3">Ilan ID</th>
                  <th className="px-4 py-3">Baslik</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Fiyat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--ghost-outline) bg-surface-lowest">
                {recentRows.length ? (
                  recentRows.map((row) => (
                    <tr key={row.id} className="transition hover:bg-(--surface-container-low)/40">
                      <td className="px-4 py-3 font-mono text-xs text-(--on-surface)/70">{row.listing_id}</td>
                      <td className="px-4 py-3">
                        <Link href={`/karealfaadmin/ilanlar/${row.id}/duzenle`} className="font-medium text-on-surface hover:text-(--secondary)">
                          {row.title}
                        </Link>
                        {user.role === "ADMIN" && row.created_by_name ? <p className="mt-1 text-xs text-(--on-surface)/45">Gonderen: {row.created_by_name}</p> : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-700">{row.publish_status}</span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-on-surface">
                        {Number(row.price ?? 0).toLocaleString("tr-TR")} {row.currency}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-(--on-surface)/45">
                      Henuz kayit yok
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-card overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-(--ghost-outline) px-5 py-4">
            <div>
              <h2 className="font-headline text-lg font-bold text-(--primary)">{user.role === "ADMIN" ? "Bekleyen admin onaylari" : "Onaya gonderilen ilanlar"}</h2>
              <p className="text-xs text-(--on-surface)/50">
                {user.role === "ADMIN" ? "Danismanlarin gonderdigi ilanlari gozden gecirin" : "Admin incelemesinde olan ilanlarinizi takip edin"}
              </p>
            </div>
            <Link href="/karealfaadmin/onay-bekleyen" className="text-sm font-semibold text-(--secondary) hover:underline">
              Ac
            </Link>
          </div>
          <div className="divide-y divide-(--ghost-outline)">
            {pendingRows.length ? (
              pendingRows.map((row) => (
                <Link key={row.id} href={`/karealfaadmin/ilanlar/${row.id}/duzenle`} className="flex items-center gap-3 px-5 py-4 hover:bg-(--surface-container-low)/40">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                    <AdminIcon name="warning" size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-on-surface">{row.title}</p>
                    <p className="truncate text-xs text-(--on-surface)/45">
                      {row.listing_id}
                      {user.role === "ADMIN" && row.created_by_name ? ` • ${row.created_by_name}` : ""}
                    </p>
                  </div>
                  <span className="text-[10px] text-(--on-surface)/35">{row.updated_at ? new Date(row.updated_at).toLocaleDateString("tr-TR") : ""}</span>
                </Link>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-10 text-center">
                <AdminIcon name="inbox" size={28} className="text-(--on-surface)/15" />
                <p className="mt-2 text-sm text-(--on-surface)/40">{user.role === "ADMIN" ? "Bekleyen danisman ilani yok" : "Onaya gonderilmis ilanin yok"}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
