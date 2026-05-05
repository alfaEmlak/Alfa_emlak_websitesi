import Link from "next/link";
import { reviewListing } from "@/app/karealfaadmin/actions";
import { displayListingCity } from "@/lib/listing-city";
import { getPanelTranslations } from "@/lib/panel-translations";
import { requirePanelUser } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ApprovalRow = {
  id: string;
  listing_id: string;
  title: string;
  city: string;
  region: string;
  publish_status: string;
  created_by_name?: string | null;
  updated_at?: string;
  detail_fields?: unknown;
};

const PENDING_STATUSES = ["PENDING_APPROVAL", "HIDDEN"] as const;

function isRejectedLike(row: ApprovalRow): boolean {
  if (row.publish_status === "REJECTED") return true;
  const df = row.detail_fields as Record<string, unknown> | null | undefined;
  return row.publish_status === "HIDDEN" && df?.adminReject === true;
}

function ListingCard({
  row,
  showActions,
  labels,
}: {
  row: ApprovalRow;
  showActions: boolean;
  labels: {
    badgeRejected: string;
    badgePending: string;
    edit: string;
    approvePublish: string;
    reject: string;
  };
}) {
  const rejected = isRejectedLike(row);
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{row.listing_id}</p>
          <h2 className="mt-1 text-lg font-bold text-zinc-900">{row.title}</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {displayListingCity(row.city)} / {row.region}
            {row.created_by_name ? ` • ${row.created_by_name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${rejected ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
            {rejected ? labels.badgeRejected : labels.badgePending}
          </span>
          <Link
            href={`/karealfaadmin/ilanlar/${row.id}/duzenle`}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            {labels.edit}
          </Link>
          {showActions && !rejected ? (
            <>
              <form
                action={async () => {
                  "use server";
                  await reviewListing(row.id, "approve");
                }}
              >
                <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
                  {labels.approvePublish}
                </button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await reviewListing(row.id, "reject");
                }}
              >
                <button type="submit" className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700">
                  {labels.reject}
                </button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default async function PendingApprovalPage({
  searchParams,
}: {
  searchParams: Promise<{ review?: string }>;
}) {
  const user = await requirePanelUser();
  const t = await getPanelTranslations();
  const sp = await searchParams;
  const reviewFailed = sp.review === "fail";
  const reviewNoPhoto = sp.review === "nophoto";

  const cardLabels = {
    badgeRejected: t("approval.badgeRejected"),
    badgePending: t("approval.badgePending"),
    edit: t("common.edit"),
    approvePublish: t("approval.approvePublish"),
    reject: t("approval.reject"),
  };

  const baseSelect =
    "id, listing_id, title, city, region, publish_status, updated_at, created_by_name, detail_fields";

  let pendingQuery = supabaseAdmin.from("listings").select(baseSelect).in("publish_status", [...PENDING_STATUSES]);

  let rejectedStatusQuery = supabaseAdmin.from("listings").select(baseSelect).eq("publish_status", "REJECTED");
  let rejectedHiddenFlagQuery = supabaseAdmin
    .from("listings")
    .select(baseSelect)
    .eq("publish_status", "HIDDEN")
    .contains("detail_fields", { adminReject: true });

  if (user.role !== "ADMIN" && user.agentId) {
    pendingQuery = pendingQuery.eq("created_by_agent_id", user.agentId);
    rejectedStatusQuery = rejectedStatusQuery.eq("created_by_agent_id", user.agentId);
    rejectedHiddenFlagQuery = rejectedHiddenFlagQuery.eq("created_by_agent_id", user.agentId);
  }

  const [pendingRes, rejectedRes, hiddenRejectedRes] = await Promise.all([
    pendingQuery.order("updated_at", { ascending: false }).limit(80),
    rejectedStatusQuery.order("updated_at", { ascending: false }).limit(50),
    rejectedHiddenFlagQuery.order("updated_at", { ascending: false }).limit(50),
  ]);

  const pendingRowsRaw = (pendingRes.data ?? []) as ApprovalRow[];
  const pendingRows = pendingRowsRaw.filter((r) => {
    if (r.publish_status === "PENDING_APPROVAL") return true;
    if (r.publish_status === "HIDDEN") return !isRejectedLike(r);
    return false;
  });

  const rejectedMerged = [...(rejectedRes.data ?? []), ...(hiddenRejectedRes.data ?? [])] as ApprovalRow[];
  const rejectedById = new Map(rejectedMerged.map((r) => [r.id, r]));
  const rejectedRows = [...rejectedById.values()].sort((a, b) => {
    const ta = new Date(a.updated_at ?? 0).getTime();
    const tb = new Date(b.updated_at ?? 0).getTime();
    return tb - ta;
  });

  const queryError = pendingRes.error ?? rejectedRes.error ?? hiddenRejectedRes.error;

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{user.role === "ADMIN" ? t("approval.titleAdmin") : t("approval.titleConsultant")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{user.role === "ADMIN" ? t("approval.subtitleAdmin") : t("approval.subtitleConsultant")}</p>
        </div>
        <Link href="/karealfaadmin/ilanlar" className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
          {t("approval.backToList")}
        </Link>
      </div>

      {reviewFailed ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{t("approval.reviewFail")}</div>
      ) : null}
      {reviewNoPhoto ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{t("approval.reviewNoPhoto")}</div>
      ) : null}

      <div className="mt-8">
        <h2 className="text-lg font-bold text-zinc-900">{t("approval.sectionPending")}</h2>
        <p className="mt-0.5 text-sm text-zinc-500">{t("approval.sectionPendingHint")}</p>
        <div className="mt-4 space-y-4">
          {queryError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-sm text-red-600">{t("approval.queryError", { message: queryError.message })}</div>
          ) : pendingRows.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">{t("approval.emptyPending")}</div>
          ) : (
            pendingRows.map((row) => <ListingCard key={row.id} row={row} showActions={user.role === "ADMIN"} labels={cardLabels} />)
          )}
        </div>
      </div>

      <div className="mt-12 border-t border-zinc-200 pt-10">
        <h2 className="text-lg font-bold text-zinc-900">{t("approval.sectionRejected")}</h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          {user.role === "ADMIN" ? t("approval.sectionRejectedHintAdmin") : t("approval.sectionRejectedHintConsultant")}
        </p>
        <div className="mt-4 space-y-4">
          {rejectedRows.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-10 text-center text-sm text-zinc-500">{t("approval.emptyRejected")}</div>
          ) : (
            rejectedRows.map((row) => <ListingCard key={row.id} row={row} showActions={false} labels={cardLabels} />)
          )}
        </div>
      </div>
    </div>
  );
}
