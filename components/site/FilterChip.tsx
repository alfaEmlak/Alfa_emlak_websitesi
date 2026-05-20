import { Link } from "@/i18n/routing";
import { X } from "lucide-react";

type Props = {
  label: string;
  value: string;
  /** Bu filtreyi kaldıran hedef URL (param çıkarılmış hali). */
  removeHref: string;
  removeLabel?: string;
};

/**
 * Aktif filtre rozeti. X'e tıklanınca ilgili parametre URL'den çıkarılarak
 * sayfaya gidilir (server-side, ekstra JS yok).
 */
export function FilterChip({ label, value, removeHref, removeLabel = "Kaldır" }: Props) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-surface-high py-1 pl-3 pr-1 text-xs text-on-surface/60">
      <span>{label}</span>
      <span className="h-3.5 w-px bg-primary/15" />
      <span className="font-medium text-primary">{value}</span>
      <Link
        href={removeHref}
        aria-label={`${removeLabel}: ${label}`}
        className="flex size-5 items-center justify-center rounded-full text-on-surface/50 transition hover:bg-primary/10 hover:text-primary"
      >
        <X className="size-3.5 shrink-0" aria-hidden />
      </Link>
    </span>
  );
}
