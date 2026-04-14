import { supabaseAdmin } from "@/lib/supabase/admin";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { MessageList } from "./MessageList";

export default async function MessagesPage() {
  const { data: messages } = await supabaseAdmin
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  const messagesList = messages || [];
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
        Siteden gelen iletişim mesajları
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
        <MessageList messages={messagesList} />
      )}
    </div>
  );
}
