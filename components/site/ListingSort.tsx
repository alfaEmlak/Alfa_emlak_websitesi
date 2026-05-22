"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export function ListingSort({ current }: { current: string }) {
  const t = useTranslations("ListingsPage");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "yeni") params.set("sirala", value);
    else params.delete("sirala");
    params.delete("page");
    const q = params.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  };

  return (
    <label className="flex items-center gap-2 text-sm text-on-surface/60">
      <span className="whitespace-nowrap font-semibold text-on-surface/55">{t("sortBy")}</span>
      <select
        value={current || "yeni"}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg bg-surface-high px-3 py-2.5 text-sm text-primary outline-none ring-1 ring-primary/[0.1] focus:ring-2 focus:ring-primary/30"
      >
        <option value="yeni">{t("newest")}</option>
        <option value="eski">{t("oldest")}</option>
        <option value="ucuz">{t("priceAsc")}</option>
        <option value="pahali">{t("priceDesc")}</option>
      </select>
    </label>
  );
}
