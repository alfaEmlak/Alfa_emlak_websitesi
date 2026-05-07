import Image from "next/image";
import Link from "next/link";
import { FileText } from "lucide-react";
import { fetchListingsWithOwnerDocuments } from "@/lib/admin-owner-documents";
import { getPanelTranslations } from "@/lib/panel-translations";
import { requireAdmin } from "@/lib/panel-auth";

function isLikelyPdf(url: string): boolean {
  return /\.pdf(\?|#|$)/i.test(url);
}

function isLikelyImage(url: string): boolean {
  return /\.(jpe?g|png|gif|webp|avif|heic|heif)(\?|#|$)/i.test(url);
}

function publishLabel(
  t: Awaited<ReturnType<typeof getPanelTranslations>>,
  code: string,
): string {
  switch (code) {
    case "DRAFT":
      return t("publishStatus.DRAFT");
    case "PENDING_APPROVAL":
      return t("publishStatus.PENDING_APPROVAL");
    case "PUBLISHED":
      return t("publishStatus.PUBLISHED");
    case "HIDDEN":
      return t("publishStatus.HIDDEN");
    case "REJECTED":
      return t("publishStatus.REJECTED");
    default:
      return code;
  }
}

export default async function KocanBelgelerPage() {
  await requireAdmin();
  const [t, rows] = await Promise.all([getPanelTranslations(), fetchListingsWithOwnerDocuments()]);

  const documentsCount = rows.reduce((n, r) => n + r.documentUrls.length, 0);

  return (
    <div className="px-4 py-8 lg:px-10">
      <header className="mx-auto max-w-6xl">
        <h1 className="font-headline text-2xl font-bold text-[var(--on-surface)]">{t("deedsDocuments.title")}</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--on-surface-muted,#64748b)]">{t("deedsDocuments.subtitle")}</p>
        <p className="mt-4 text-sm font-medium text-zinc-700">
          {t("deedsDocuments.summary", { listingsCount: rows.length, documentsCount })}
        </p>
      </header>

      <div className="mx-auto mt-8 max-w-6xl space-y-10">
        {!rows.length ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-16 text-center text-sm text-zinc-500">
            {t("deedsDocuments.empty")}
          </p>
        ) : (
          rows.map((row) => (
            <section key={row.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 pb-4">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold text-zinc-900">{row.title}</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    {t("deedsDocuments.publicId")}:{" "}
                    <span className="font-mono font-medium text-zinc-700">{row.listingId}</span>
                    <span className="mx-1.5 text-zinc-300">·</span>
                    {publishLabel(t, row.publishStatus)}
                    <span className="mx-1.5 text-zinc-300">·</span>
                    {t("deedsDocuments.docCountLabel", { count: row.documentUrls.length })}
                  </p>
                </div>
                <Link
                  href={`/karealfaadmin/ilanlar/${encodeURIComponent(row.id)}/duzenle`}
                  className="shrink-0 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  {t("deedsDocuments.openListing")}
                </Link>
              </div>

              <ul className="mt-4 flex flex-wrap gap-3">
                {row.documentUrls.map((url, di) => {
                  const pdf = isLikelyPdf(url);
                  const img = !pdf && isLikelyImage(url);
                  return (
                    <li key={`${row.id}-${di}-${url}`}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-36 w-28 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 transition hover:border-emerald-400 hover:shadow-md sm:h-40 sm:w-32"
                      >
                        {pdf ? (
                          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-2 text-center">
                            <FileText className="h-10 w-10 text-red-700" aria-hidden />
                            <span className="text-[10px] font-semibold uppercase text-red-800">{t("deedsDocuments.pdfBadge")}</span>
                          </div>
                        ) : img ? (
                          <div className="relative flex-1 bg-zinc-200">
                            <Image src={url} alt="" fill className="object-cover" sizes="128px" unoptimized />
                          </div>
                        ) : (
                          <div className="flex flex-1 flex-col items-center justify-center gap-1 px-2 text-center">
                            <FileText className="h-8 w-8 text-zinc-500" aria-hidden />
                            <span className="text-[10px] text-zinc-600">{t("deedsDocuments.fileBadge")}</span>
                          </div>
                        )}
                        <span className="border-t border-zinc-100 bg-white px-2 py-1.5 text-center text-[11px] font-medium text-emerald-800">
                          {t("deedsDocuments.openFile")}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
