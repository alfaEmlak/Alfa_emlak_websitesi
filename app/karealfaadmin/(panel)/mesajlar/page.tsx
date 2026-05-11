import { supabaseAdmin } from "@/lib/supabase/admin";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { splitContactAiLeadMessage } from "@/lib/ai-forms-checkpoint";
import { requirePanelUser } from "@/lib/panel-auth";
import { MessageList } from "./MessageList";

export default async function MessagesPage() {
  const user = await requirePanelUser();

  let query = supabaseAdmin.from("contact_messages").select("*").order("created_at", { ascending: false });
  if (user.role === "CONSULTANT" && user.agentId) {
    query = query.eq("agent_id", user.agentId);
  }

  const { data: messages } = await query;

  const messagesList = messages || [];

  const listingIds = [...new Set(messagesList.map((m) => m.listing_id).filter((x): x is string => typeof x === "string" && x.length > 0))];
  const titleByListingId = new Map<string, string>();
  if (listingIds.length > 0) {
    const { data: listingRows } = await supabaseAdmin.from("listings").select("listing_id, title").in("listing_id", listingIds);
    for (const row of listingRows ?? []) {
      if (typeof row.listing_id === "string" && typeof row.title === "string") {
        titleByListingId.set(row.listing_id, row.title);
      }
    }
  }
  const unreadCount = messagesList.filter((m) => !m.is_read).length;

  return (
    <div className="p-6 lg:p-10">
      <div className="flex items-center gap-4">
        <h1 className="admin-page-title text-3xl font-extrabold">Gelen Kutusu</h1>
        {unreadCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
            {unreadCount} yeni
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-(--on-surface)/55">
        {user.role === "ADMIN"
          ? "Siteden gelen iletişim mesajları"
          : "İlanlarınız üzerinden size iletilen mesajlar"}
      </p>

      {messagesList.length === 0 ? (
        <div className="admin-card mt-8 flex flex-col items-center justify-center p-16 text-center">
          <AdminIcon name="inbox" size={48} className="text-(--on-surface)/20" />
          <p className="mt-4 text-lg font-semibold text-(--on-surface)/40">Henüz mesaj yok</p>
          <p className="mt-1 text-sm text-(--on-surface)/30">
            Sitenizdeki iletişim formundan mesaj geldiğinde burada görünecektir.
          </p>
        </div>
      ) : (
        <MessageList
          messages={messagesList.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            phone: m.phone,
            subject: m.subject,
            message:
              m.subject === "AI_LEAD"
                ? splitContactAiLeadMessage(m.message).summary || m.message || ""
                : m.message || "",
            listingId: m.listing_id,
            listingTitle: m.listing_id ? titleByListingId.get(m.listing_id) ?? null : null,
            isRead: m.is_read,
            createdAt: m.created_at,
            status: m.status || "NEW",
            notes: m.notes || "",
            agentId: m.agent_id || null,
          }))}
        />
      )}
    </div>
  );
}
