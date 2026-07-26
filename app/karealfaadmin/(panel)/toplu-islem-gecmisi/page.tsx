import { AdminIcon } from "@/components/admin/AdminIcon";
import { requireAdmin } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type BulkOperation = {
  id: string;
  actor_name: string | null;
  action: string;
  scope: string;
  filter_json: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  affected_count: number;
  skipped_count: number;
  error: string | null;
  created_at: string;
};

const ACTION_LABELS: Record<string, string> = {
  soft_delete: "Toplu silme",
  restore: "Geri yükleme",
  purge: "Kalıcı silme",
  set_status: "Durum değiştirme",
  review: "Onay / red",
  assign_agent: "Danışman atama",
  set_featured: "Vitrin",
  update_price: "Fiyat güncelleme",
  set_feed_flags: "Feed bayrağı",
  set_taxonomy: "Kategori düzeltme",
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

/** Filtre ve ayarları tek satırda okunur hale getirir. */
function summarize(record: Record<string, unknown> | null): string {
  if (!record) return "—";
  const parts = Object.entries(record)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}: ${String(v)}`);
  return parts.length ? parts.join(", ") : "—";
}

export default async function BulkOperationHistoryPage() {
  await requireAdmin();

  const { data, error } = await supabaseAdmin
    .from("bulk_operations")
    .select("id, actor_name, action, scope, filter_json, payload, affected_count, skipped_count, error, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  const rows = (data ?? []) as BulkOperation[];

  return (
    <div className="p-6 lg:p-10">
      <div>
        <h1 className="text-3xl font-extrabold">Toplu işlem geçmişi</h1>
        <p className="mt-1 text-sm text-zinc-500">
          İlanlara toplu etki eden işlemlerin denetim kaydı (en yeni üstte, son 300 kayıt).
        </p>
      </div>

      {error ? (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          Kayıtlar okunamadı: {error.message}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-16 text-center">
          <AdminIcon name="analytics" size={48} className="text-zinc-300" />
          <p className="mt-4 text-lg font-semibold text-zinc-400">Henüz toplu işlem yapılmadı</p>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-semibold">Tarih</th>
                <th className="px-4 py-3 font-semibold">Kullanıcı</th>
                <th className="px-4 py-3 font-semibold">İşlem</th>
                <th className="px-4 py-3 font-semibold">Kapsam</th>
                <th className="px-4 py-3 font-semibold">Etkilenen</th>
                <th className="px-4 py-3 font-semibold">Atlanan</th>
                <th className="px-4 py-3 font-semibold">Ayrıntı</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-zinc-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-700">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3 font-medium text-zinc-800">{r.actor_name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-bold text-zinc-700">
                      {ACTION_LABELS[r.action] ?? r.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {r.scope === "filter" ? "Filtreye uyan tümü" : "Seçim"}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-zinc-800">{r.affected_count}</td>
                  <td className="px-4 py-3 tabular-nums text-zinc-500">{r.skipped_count}</td>
                  <td className="max-w-xs px-4 py-3 text-xs text-zinc-500">
                    {r.error ? (
                      <span className="text-rose-700">Hata: {r.error}</span>
                    ) : (
                      <span className="line-clamp-2">
                        {r.scope === "filter" ? summarize(r.filter_json) : summarize(r.payload)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
