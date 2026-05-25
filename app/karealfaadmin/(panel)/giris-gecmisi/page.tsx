import { AdminIcon } from "@/components/admin/AdminIcon";
import { requireAdmin } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type LoginEvent = {
  id: string;
  actor_name: string | null;
  role: string;
  email: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default async function LoginHistoryPage() {
  await requireAdmin();

  const { data } = await supabaseAdmin
    .from("login_events")
    .select("id, actor_name, role, email, ip, user_agent, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  const events = (data ?? []) as LoginEvent[];

  return (
    <div className="p-6 lg:p-10">
      <div>
        <h1 className="text-3xl font-extrabold">Giriş geçmişi</h1>
        <p className="mt-1 text-sm text-zinc-500">Panele yapılan son girişler (en yeni üstte, son 300 kayıt).</p>
      </div>

      {events.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-16 text-center">
          <AdminIcon name="analytics" size={48} className="text-zinc-300" />
          <p className="mt-4 text-lg font-semibold text-zinc-400">Henüz giriş kaydı yok</p>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-semibold">Tarih</th>
                <th className="px-4 py-3 font-semibold">Kullanıcı</th>
                <th className="px-4 py-3 font-semibold">Rol</th>
                <th className="px-4 py-3 font-semibold">E-posta</th>
                <th className="px-4 py-3 font-semibold">IP</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b border-zinc-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-700">{formatDate(e.created_at)}</td>
                  <td className="px-4 py-3 font-medium text-zinc-800">{e.actor_name || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        e.role === "ADMIN" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {e.role === "ADMIN" ? "Yönetici" : "Danışman"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{e.email || "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">{e.ip || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
