import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { StatusEditor } from "./StatusEditor";
import type { LeadStatus } from "@/lib/ai/types";

type Props = { params: Promise<{ id: string }> };

export default async function UserFormDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const { data } = await supabaseAdmin.from("ai_customer_forms").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  const prefs = data.property_preferences || {};
  const recIds = Array.isArray(data.recommended_listing_ids)
    ? data.recommended_listing_ids
    : Array.isArray(data.matched_listing_ids)
      ? data.matched_listing_ids
      : [];

  return (
    <div className="p-6 lg:p-10">
      <h1 className="admin-page-title text-3xl font-extrabold">Kullanıcı Formu Detayı</h1>
      <p className="mt-1 text-sm text-(--on-surface)/55">
        Oluşturulma: {new Date(data.created_at).toLocaleString("tr-TR")}
      </p>

      <div className="admin-card mt-6 grid gap-6 p-6 lg:grid-cols-2">
        <div>
          <p className="text-xs text-(--on-surface)/45">Ad</p>
          <p className="font-semibold text-(--primary)">{data.first_name || data.full_name?.split(" ")[0] || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-(--on-surface)/45">Soyad</p>
          <p className="font-semibold text-(--primary)">{data.last_name || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-(--on-surface)/45">Telefon</p>
          <p>{data.phone || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-(--on-surface)/45">E-posta</p>
          <p>{data.email || "-"}</p>
        </div>
        <div className="lg:col-span-2">
          <p className="text-xs text-(--on-surface)/45">Durum</p>
          <div className="mt-1">
            <StatusEditor id={data.id} initialStatus={(data.status || "new") as LeadStatus} />
          </div>
        </div>
      </div>

      <div className="admin-card mt-6 p-6">
        <p className="text-xs text-(--on-surface)/45">Konuşma Özeti</p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-(--on-surface)/80">
          {data.conversation_summary || data.desired_home_summary || "-"}
        </p>
      </div>

      <div className="admin-card mt-6 p-6">
        <p className="text-xs text-(--on-surface)/45">Tercih JSON</p>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
          {JSON.stringify(prefs, null, 2)}
        </pre>
      </div>

      <div className="admin-card mt-6 p-6">
        <p className="text-xs text-(--on-surface)/45">Önerilen İlanlar</p>
        <p className="mt-2 text-sm text-(--on-surface)/80">{recIds.length > 0 ? recIds.join(", ") : "-"}</p>
      </div>
    </div>
  );
}
