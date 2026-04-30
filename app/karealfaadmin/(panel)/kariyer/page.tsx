import { supabaseAdmin } from "@/lib/supabase/admin";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { requireAdmin } from "@/lib/panel-auth";
import { CareerList } from "./CareerList";

export default async function CareerApplicationsPage() {
  await requireAdmin();
  const { data: rows } = await supabaseAdmin
    .from("career_applications")
    .select("*")
    .order("created_at", { ascending: false });

  const list = rows || [];
  const unread = list.filter((m) => !m.is_read).length;

  return (
    <div className="p-6 lg:p-10">
      <div className="flex items-center gap-4">
        <h1 className="admin-page-title text-3xl font-extrabold">Kariyer Başvuruları</h1>
        {unread > 0 && (
          <span className="inline-flex items-center rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
            {unread} yeni
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-(--on-surface)/55">
        Siteden gelen kariyer başvuruları
      </p>

      {list.length === 0 ? (
        <div className="admin-card mt-8 flex flex-col items-center justify-center p-16 text-center">
          <AdminIcon name="person_add" size={48} className="text-(--on-surface)/20" />
          <p className="mt-4 text-lg font-semibold text-(--on-surface)/40">Henüz başvuru yok</p>
          <p className="mt-1 text-sm text-(--on-surface)/30">
            Sitedeki Kariyer formundan başvuru geldiğinde burada görünecektir.
          </p>
        </div>
      ) : (
        <CareerList
          items={list.map((m) => ({
            id: m.id,
            firstName: m.first_name,
            lastName: m.last_name,
            email: m.email,
            phone: m.phone,
            message: m.message,
            cvUrl: m.cv_url,
            cvFilename: m.cv_filename,
            isRead: m.is_read,
            status: m.status || "NEW",
            notes: m.notes || "",
            createdAt: m.created_at,
          }))}
        />
      )}
    </div>
  );
}
