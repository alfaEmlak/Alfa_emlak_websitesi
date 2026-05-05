import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { requirePanelUser } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const APPROVAL_STATUSES = ["PENDING_APPROVAL", "HIDDEN"] as const;

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePanelUser();

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

  let unreadInboxCount = 0;
  if (user.role === "ADMIN") {
    const { count } = await supabaseAdmin
      .from("contact_messages")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false);
    unreadInboxCount = count ?? 0;
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar
        role={user.role}
        pendingCount={pendingCount}
        unreadInboxCount={unreadInboxCount}
        userName={user.name ?? undefined}
      />
      <div className="admin-scroll admin-shell flex-1 overflow-x-hidden text-[var(--on-surface)]">{children}</div>
    </div>
  );
}
