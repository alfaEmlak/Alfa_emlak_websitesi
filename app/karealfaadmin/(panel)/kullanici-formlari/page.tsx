import { requireAdmin } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AdminIcon } from "@/components/admin/AdminIcon";

export default async function AiCustomerFormsPage() {
  await requireAdmin();

  const { data: rows } = await supabaseAdmin
    .from("contact_messages")
    .select("*")
    .eq("subject", "AI_LEAD")
    .order("created_at", { ascending: false });

  const list = rows || [];

  return (
    <div className="p-6 lg:p-10">
      <div className="flex items-center gap-3">
        <h1 className="admin-page-title text-3xl font-extrabold">Kullanıcı Formları</h1>
        <span className="inline-flex items-center rounded-full bg-(--primary) px-3 py-1 text-xs font-bold text-white">
          {list.length} kayıt
        </span>
      </div>
      <p className="mt-1 text-sm text-(--on-surface)/55">
        Yapay zeka danışmanı ile konuşan ziyaretçilerin iletişim ve ihtiyaç bilgileri.
      </p>

      {list.length === 0 ? (
        <div className="admin-card mt-8 flex flex-col items-center justify-center p-16 text-center">
          <AdminIcon name="forum" size={48} className="text-(--on-surface)/20" />
          <p className="mt-4 text-lg font-semibold text-(--on-surface)/40">Henüz form yok</p>
          <p className="mt-1 text-sm text-(--on-surface)/30">AI asistanı üzerinden form geldiğinde burada görünecektir.</p>
        </div>
      ) : (
        <div className="admin-card mt-8 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-(--ghost-outline) text-(--on-surface)/55">
              <tr>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Ad Soyad</th>
                <th className="px-4 py-3">Telefon</th>
                <th className="px-4 py-3">E-posta</th>
                <th className="px-4 py-3">İstenen İlan/Kriter Özeti</th>
                <th className="px-4 py-3">Önerilen İlanlar</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item.id} className="border-b border-(--ghost-outline)/70 align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-(--on-surface)/50">
                    {new Date(item.created_at).toLocaleString("tr-TR")}
                  </td>
                  <td className="px-4 py-3 font-semibold text-(--primary)">{item.name || "-"}</td>
                  <td className="px-4 py-3">{item.phone}</td>
                  <td className="px-4 py-3">{item.email}</td>
                  <td className="px-4 py-3 min-w-[320px] whitespace-pre-wrap text-xs text-(--on-surface)/75">
                    {item.message || "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-(--on-surface)/70">{item.listing_id || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
