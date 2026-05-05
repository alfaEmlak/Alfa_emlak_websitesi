"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { setPanelLocale } from "@/app/karealfaadmin/actions";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<(typeof routing.locales)[number], string> = {
  tr: "TR",
  en: "EN",
  ru: "RU",
  de: "DE",
  fa: "FA",
};

export function PanelLanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("Panel");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className={`flex ${compact ? "w-full flex-col gap-1" : "flex-col gap-1"} text-left`}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t("language")}</span>
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(async () => {
            await setPanelLocale(next);
            router.refresh();
          });
        }}
        className={`rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white outline-none transition hover:bg-white/15 focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/30 disabled:opacity-50 ${compact ? "w-full" : ""}`}
        aria-label={t("language")}
      >
        {routing.locales.map((loc) => (
          <option key={loc} value={loc} className="bg-[#0a1f5c] text-white">
            {LOCALE_LABELS[loc]} — {t(`localeNames.${loc}` as const)}
          </option>
        ))}
      </select>
    </label>
  );
}
