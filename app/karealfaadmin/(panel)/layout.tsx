import { cookies } from "next/headers";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

/** Çerez + Supabase sayımları her istekte güncel kalsın (yeni AI form rozeti vb.). */
export const dynamic = "force-dynamic";
import { AiFormsCheckpointSync } from "@/components/admin/AiFormsCheckpointSync";
import { countTruePendingApprovalBadge } from "@/lib/panel-pending-approval-count";
import { AI_FORMS_CHECKPOINT_COOKIE, countAiFormsNewerThanCheckpoint } from "@/lib/ai-forms-checkpoint";
import { requirePanelUser } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePanelUser();

  const pendingCount =
    user.role === "CONSULTANT" && !user.agentId
      ? 0
      : await countTruePendingApprovalBadge(user.role === "CONSULTANT" ? user.agentId ?? undefined : undefined);

  let unreadInboxCount = 0;
  if (user.role === "ADMIN") {
    const { count } = await supabaseAdmin
      .from("contact_messages")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false);
    unreadInboxCount = count ?? 0;
  } else if (user.role === "CONSULTANT" && user.agentId) {
    const { count } = await supabaseAdmin
      .from("contact_messages")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false)
      .eq("agent_id", user.agentId);
    unreadInboxCount = count ?? 0;
  }

  let newUserFormsCount = 0;
  if (user.role === "ADMIN") {
    const jar = await cookies();
    const checkpoint = jar.get(AI_FORMS_CHECKPOINT_COOKIE)?.value;
    newUserFormsCount = await countAiFormsNewerThanCheckpoint(checkpoint);
  }

  let pendingAgentsCount = 0;
  if (user.role === "ADMIN") {
    const { count } = await supabaseAdmin
      .from("agents")
      .select("*", { count: "exact", head: true })
      .or("is_active.is.null,is_active.eq.false");
    pendingAgentsCount = count ?? 0;
  }

  return (
    <div className="flex min-h-screen">
      {user.role === "ADMIN" ? <AiFormsCheckpointSync /> : null}
      <AdminSidebar
        role={user.role}
        pendingCount={pendingCount}
        unreadInboxCount={unreadInboxCount}
        newUserFormsCount={newUserFormsCount}
        pendingAgentsCount={pendingAgentsCount}
        userName={user.name ?? undefined}
      />
      <div className="admin-scroll admin-shell flex-1 overflow-x-hidden text-[var(--on-surface)]">{children}</div>
    </div>
  );
}
