import Link from "next/link";
import { reviewListing } from "@/app/karealfaadmin/actions";
import { requirePanelUser } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ApprovalRow = {
  id: string;
  listing_id: string;
  title: string;
  city: string;
  region: string;
  publish_status: string;
  created_by_name?: string | null;
  updated_at?: string;
};

const APPROVAL_STATUSES = ["PENDING_APPROVAL", "HIDDEN", "REJECTED"] as const;

export default async function PendingApprovalPage() {
  const user = await requirePanelUser();

  let query = supabaseAdmin
    .from("listings")
    .select("id, listing_id, title, city, region, publish_status, updated_at")
    .in("publish_status", [...APPROVAL_STATUSES]);

  if (user.role !== "ADMIN" && user.agentId) {
    query = query.eq("created_by_agent_id", user.agentId);
  }

  let result = await query.order("updated_at", { ascending: false }).limit(100);

  const rows = (result.data ?? []) as ApprovalRow[];

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{user.role === "ADMIN" ? "Danisman onay kuyrugu" : "Onaya gonderdigim ilanlar"}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {user.role === "ADMIN"
              ? "Danismanlarin gonderdigi ilanlari inceleyin, duzenleyin ve karara baglayin."
              : "Admin incelemesine gonderdiginiz ilanlarin durumunu buradan takip edebilirsiniz."}
          </p>
        </div>
        <Link href="/karealfaadmin/ilanlar" className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
          Ilan listesine don
        </Link>
      </div>

      <div className="mt-6 space-y-4">
        {result.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-sm text-red-500">
            Hata oluştu: {result.error.message} <br />
            Details: {result.error.details} <br />
            Hint: {result.error.hint}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">Kayit bulunamadi.</div>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{row.listing_id}</p>
                  <h2 className="mt-1 text-lg font-bold text-zinc-900">{row.title}</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {row.city} / {row.region}
                    {row.created_by_name ? ` • ${row.created_by_name}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${row.publish_status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                    {row.publish_status === "REJECTED" ? "Reddedildi" : "Onay Bekliyor"}
                  </span>
                  <Link href={`/karealfaadmin/ilanlar/${row.id}/duzenle`} className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
                    Duzenle
                  </Link>
                  {user.role === "ADMIN" ? (
                    <>
                      <form
                        action={async () => {
                          "use server";
                          await reviewListing(row.id, "approve");
                        }}
                      >
                        <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
                          Onayla ve Yayinla
                        </button>
                      </form>
                      <form
                        action={async () => {
                          "use server";
                          await reviewListing(row.id, "reject");
                        }}
                      >
                        <button type="submit" className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700">
                          Reddet
                        </button>
                      </form>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
