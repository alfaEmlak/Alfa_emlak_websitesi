import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { requirePanelUser } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const APPROVAL_STATUSES = ["PENDING_APPROVAL", "HIDDEN"] as const;

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePanelUser();

  const locale = await getLocale();
  const messages = await getMessages();

  const pendingCount =
    user.role === "ADMIN"
      ? (
          await supabaseAdmin
            .from("listings")
            .select("*", { count: "exact", head: true })
            .in("publish_status", [...APPROVAL_STATUSES])
        ).count ?? 0
      : (
          await supabaseAdmin
            .from("listings")
            .select("*", { count: "exact", head: true })
            .in("publish_status", [...APPROVAL_STATUSES])
            .eq("created_by_agent_id", user.agentId ?? "")
        ).count ?? 0;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex min-h-screen">
        <AdminSidebar role={user.role} pendingCount={pendingCount} userName={user.name ?? undefined} />
        <div className="admin-scroll admin-shell flex-1 overflow-x-hidden text-[var(--on-surface)]">{children}</div>
      </div>
    </NextIntlClientProvider>
  );
}
