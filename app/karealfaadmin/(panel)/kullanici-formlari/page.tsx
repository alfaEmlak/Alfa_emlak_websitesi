import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { UserFormsTable, type UserFormRow } from "@/components/admin/UserFormsTable";
import {
  AI_FORMS_CHECKPOINT_COOKIE,
  isAiFormRowNew,
  parseStoredChatTranscript,
  splitContactAiLeadMessage,
} from "@/lib/ai-forms-checkpoint";

type AiRow = {
  id: string;
  created_at: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  desired_home_summary: string | null;
  conversation_summary: string | null;
  chat_transcript: string | null;
  matched_listing_ids: string[] | null;
  recommended_listing_ids: unknown;
};

type ContactRow = {
  id: string;
  created_at: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
  listing_id: string | null;
};

function listingIdsTextAi(row: AiRow): string {
  const rec = row.recommended_listing_ids;
  if (Array.isArray(rec) && rec.every((x): x is string => typeof x === "string")) {
    return rec.length ? rec.join(", ") : "-";
  }
  const m = row.matched_listing_ids;
  if (Array.isArray(m) && m.length > 0) return m.join(", ");
  return "-";
}

export default async function AiCustomerFormsPage() {
  await requireAdmin();

  const jar = await cookies();
  const checkpoint = jar.get(AI_FORMS_CHECKPOINT_COOKIE)?.value;

  const [{ data: aiData }, { data: contactData }] = await Promise.all([
    supabaseAdmin
      .from("ai_customer_forms")
      .select(
        "id, created_at, full_name, phone, email, desired_home_summary, conversation_summary, chat_transcript, matched_listing_ids, recommended_listing_ids",
      )
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("contact_messages").select("*").eq("subject", "AI_LEAD").order("created_at", { ascending: false }),
  ]);

  const aiRows = (aiData || []) as AiRow[];
  const contactRows = (contactData || []) as ContactRow[];

  const unified: UserFormRow[] = [];

  for (const row of aiRows) {
    const summary = row.conversation_summary || row.desired_home_summary || "";
    unified.push({
      key: `ai:${row.id}`,
      source: "ai",
      id: row.id,
      createdAt: row.created_at,
      name: row.full_name || "-",
      phone: row.phone,
      email: row.email,
      summary,
      listingIdsText: listingIdsTextAi(row),
      isNew: isAiFormRowNew(row.created_at, checkpoint),
      transcript: parseStoredChatTranscript(row.chat_transcript),
      detailHref: `/karealfaadmin/kullanici-formlari/${row.id}`,
    });
  }

  for (const row of contactRows) {
    const { summary: contactSummary, transcript: contactTranscript } = splitContactAiLeadMessage(row.message);
    unified.push({
      key: `contact:${row.id}`,
      source: "contact",
      id: row.id,
      createdAt: row.created_at,
      name: row.name || "-",
      phone: row.phone,
      email: row.email,
      summary: contactSummary || row.message || "",
      listingIdsText: row.listing_id || "-",
      isNew: isAiFormRowNew(row.created_at, checkpoint),
      transcript: contactTranscript,
      detailHref: null,
    });
  }

  unified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="p-6 lg:p-10">
      <div className="flex items-center gap-3">
        <h1 className="admin-page-title text-3xl font-extrabold">Kullanıcı Formları</h1>
        <span className="inline-flex items-center rounded-full bg-(--primary) px-3 py-1 text-xs font-bold text-white">
          {unified.length} kayıt
        </span>
      </div>
      <p className="mt-1 text-sm text-(--on-surface)/55">
        Yapay zeka danışmanı ile konuşan ziyaretçilerin iletişim ve ihtiyaç bilgileri. Sayfadan çıktığınızda “yeni” işaretleri sıfırlanır; yalnızca
        bundan sonra gelen talepler yeşil görünür.
      </p>

      {unified.length === 0 ? (
        <div className="admin-card mt-8 flex flex-col items-center justify-center p-16 text-center">
          <AdminIcon name="forum" size={48} className="text-(--on-surface)/20" />
          <p className="mt-4 text-lg font-semibold text-(--on-surface)/40">Henüz form yok</p>
          <p className="mt-1 text-sm text-(--on-surface)/30">AI asistanı üzerinden form geldiğinde burada görünecektir.</p>
        </div>
      ) : (
        <UserFormsTable rows={unified} />
      )}
    </div>
  );
}
