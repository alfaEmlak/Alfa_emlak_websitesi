import Link from "next/link";
import Image from "next/image";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { requireAdmin } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { approveAgent, rejectAgent } from "@/app/karealfaadmin/module-actions";
import { AgentReorder } from "@/components/admin/AgentReorder";
import { AgentTempPassword } from "@/components/admin/AgentTempPassword";
import { AgentDeleteButton } from "@/components/admin/AgentDeleteButton";

function agentSortKey(a: { sort_order?: number | null }): number {
  return typeof a.sort_order === "number" ? a.sort_order : 1000;
}

export default async function AgentsPage() {
  await requireAdmin();
  const { data: agents } = await supabaseAdmin
    .from("agents")
    .select("*")
    .order("created_at", { ascending: false });

  // sort_order'a göre sırala (kolon yoksa created_at sırası korunur).
  const agentsList = [...(agents || [])].sort((a, b) => agentSortKey(a) - agentSortKey(b));
  const pendingAgents = agentsList.filter((agent) => !agent.is_active);
  const activeAgents = agentsList.filter((agent) => agent.is_active);

  return (
    <div className="p-6 lg:p-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Danışmanlar</h1>
          <p className="mt-1 text-sm text-zinc-500">Emlak danışmanlarını yönetin</p>
          {pendingAgents.length > 0 ? (
            <p className="mt-2 text-sm font-semibold text-amber-700">
              {pendingAgents.length} danışman üyelik onayı bekliyor.
            </p>
          ) : null}
        </div>
        <Link
          href="/karealfaadmin/danismanlar/yeni"
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700"
        >
          <AdminIcon name="person_add" size={18} />
          Yeni Danışman
        </Link>
      </div>

      {activeAgents.length > 1 ? (
        <div className="mt-8">
          <AgentReorder
            initial={activeAgents.map((a) => ({ id: a.id, name: a.name, title: a.title, photo: a.photo }))}
          />
        </div>
      ) : null}

      {agentsList.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-16 text-center">
          <AdminIcon name="group" size={48} className="text-zinc-300" />
          <p className="mt-4 text-lg font-semibold text-zinc-400">Henüz danışman eklenmedi</p>
          <Link
            href="/karealfaadmin/danismanlar/yeni"
            className="mt-4 text-sm font-semibold text-emerald-600 hover:underline"
          >
            İlk danışmanı ekleyin →
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agentsList.map((a) => (
            <div key={a.id} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <Link href={`/karealfaadmin/danismanlar/${a.id}/ilanlar`} className="group flex items-start gap-4">
                <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-zinc-200 bg-zinc-100">
                  {a.photo ? (
                    <Image src={a.photo} alt={a.name} fill className="object-cover" sizes="64px" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-400">
                      <AdminIcon name="person" size={32} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-zinc-800 truncate transition group-hover:text-emerald-700">{a.name}</h3>
                  <p className="text-xs text-zinc-500">{a.title || "Emlak Danışmanı"}</p>
                  <p className="text-xs text-zinc-400 mt-1">{a.email}</p>
                  {a.phone && <p className="text-xs text-zinc-400">{a.phone}</p>}
                </div>
              </Link>
              <div className="mt-4 flex gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  a.role === "ADMIN" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                }`}>
                  {a.role === "ADMIN" ? "Yönetici" : "Danışman"}
                </span>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  a.is_active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}>
                  {a.is_active ? "Aktif" : "Onay bekliyor"}
                </span>
              </div>
              {a.is_active ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href={`/karealfaadmin/danismanlar/${a.id}/ilanlar`}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-center text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                  >
                    İlanları gör
                  </Link>
                  <Link
                    href={`/karealfaadmin/danismanlar/${a.id}/duzenle`}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Düzenle
                  </Link>
                </div>
              ) : null}
              {a.is_active ? <AgentTempPassword agentId={a.id} /> : null}
              <AgentDeleteButton agentId={a.id} agentName={a.name} />
              {!a.is_active ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <form action={approveAgent.bind(null, a.id)}>
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                    >
                      Kabul et
                    </button>
                  </form>
                  <form action={rejectAgent.bind(null, a.id)}>
                    <button
                      type="submit"
                      className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100"
                    >
                      Reddet
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
