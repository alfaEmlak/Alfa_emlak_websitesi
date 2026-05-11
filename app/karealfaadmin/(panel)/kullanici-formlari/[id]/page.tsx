import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseStoredChatTranscript } from "@/lib/ai-forms-checkpoint";
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
  const transcript = parseStoredChatTranscript(data.chat_transcript as string | null | undefined);

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

      {transcript && transcript.length > 0 ? (
        <div className="admin-card mt-6 p-6">
          <p className="text-xs text-(--on-surface)/45">Tam konuşma</p>
          <div className="mt-4 flex max-h-[480px] flex-col gap-3 overflow-y-auto rounded-xl border border-(--ghost-outline) bg-slate-50/80 p-4">
            {transcript.map((line, i) => {
              const isUser = line.role === "user";
              const isAssistant = line.role === "assistant";
              return (
                <div
                  key={`${i}-${line.role}`}
                  className={`max-w-[95%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    isUser
                      ? "self-end bg-(--primary) text-white"
                      : isAssistant
                        ? "self-start border border-slate-200 bg-white text-slate-900"
                        : "self-start border border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wide opacity-70">
                    {isUser ? "Ziyaretçi" : isAssistant ? "Yapay zeka" : line.role}
                  </p>
                  {line.content}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

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
