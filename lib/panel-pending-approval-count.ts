import { supabaseAdmin } from "@/lib/supabase/admin";

/** Onay sayfası / sidebar ile uyumlu: reddedilmiş veya HIDDEN+adminReject. */
export function isListingRejectedLike(row: { publish_status: string; detail_fields?: unknown }): boolean {
  if (row.publish_status === "REJECTED") return true;
  const df = row.detail_fields as Record<string, unknown> | null | undefined;
  return row.publish_status === "HIDDEN" && df?.adminReject === true;
}

/** Gerçekten onay bekleyen satır (reddedilenler hariç). */
export function isTruePendingApprovalRow(row: { publish_status: string; detail_fields?: unknown }): boolean {
  if (row.publish_status === "PENDING_APPROVAL") return true;
  if (row.publish_status === "HIDDEN") return !isListingRejectedLike(row);
  return false;
}

/**
 * Onay bekleyen sayfasındaki “Onay bekleyenler” bölümü ile aynı mantık:
 * - PENDING_APPROVAL
 * - veya HIDDEN ama reddedilmiş sayılmayan (detail_fields içinde adminReject:true yok; null detail_fields dahil)
 *
 * REJECTED durumu veya HIDDEN+adminReject burada sayılmaz.
 */
export async function countTruePendingApprovalBadge(agentScopedId: string | undefined): Promise<number> {
  // Çöp kutusundaki ilanlar HIDDEN olarak durur; onay kuyruğunda sayılmamaları için elenir.
  let qPending = supabaseAdmin
    .from("listings")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null)
    .eq("publish_status", "PENDING_APPROVAL");

  let qHiddenNoDetail = supabaseAdmin
    .from("listings")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null)
    .eq("publish_status", "HIDDEN")
    .is("detail_fields", null);

  let qHiddenNotRejected = supabaseAdmin
    .from("listings")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null)
    .eq("publish_status", "HIDDEN")
    .not("detail_fields", "is", null)
    .not("detail_fields", "cs", '{"adminReject":true}');

  if (agentScopedId) {
    qPending = qPending.eq("created_by_agent_id", agentScopedId);
    qHiddenNoDetail = qHiddenNoDetail.eq("created_by_agent_id", agentScopedId);
    qHiddenNotRejected = qHiddenNotRejected.eq("created_by_agent_id", agentScopedId);
  }

  const [r1, r2, r3] = await Promise.all([qPending, qHiddenNoDetail, qHiddenNotRejected]);
  return (r1.count ?? 0) + (r2.count ?? 0) + (r3.count ?? 0);
}
