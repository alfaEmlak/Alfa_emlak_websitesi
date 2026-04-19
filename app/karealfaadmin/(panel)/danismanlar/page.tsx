import Link from "next/link";
import Image from "next/image";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { requireAdmin } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function AgentsPage() {
  await requireAdmin();
  const { data: agents } = await supabaseAdmin
    .from("agents")
    .select("*")
    .order("created_at", { ascending: false });

  const agentsList = agents || [];

  return (
    <div className="p-6 lg:p-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Danışmanlar</h1>
          <p className="mt-1 text-sm text-zinc-500">Emlak danışmanlarını yönetin</p>
        </div>
        <Link
          href="/karealfaadmin/danismanlar/yeni"
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700"
        >
          <AdminIcon name="person_add" size={18} />
          Yeni Danışman
        </Link>
      </div>

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
              <div className="flex items-start gap-4">
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
                  <h3 className="font-bold text-zinc-800 truncate">{a.name}</h3>
                  <p className="text-xs text-zinc-500">{a.title || "Emlak Danışmanı"}</p>
                  <p className="text-xs text-zinc-400 mt-1">{a.email}</p>
                  {a.phone && <p className="text-xs text-zinc-400">{a.phone}</p>}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  a.role === "ADMIN" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                }`}>
                  {a.role === "ADMIN" ? "Yönetici" : "Danışman"}
                </span>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  a.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}>
                  {a.is_active ? "Aktif" : "Pasif"}
                </span>
              </div>
              <Link
                href={`/karealfaadmin/danismanlar/${a.id}/duzenle`}
                className="mt-4 block text-center text-sm font-semibold text-emerald-600 hover:underline"
              >
                Düzenle
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
