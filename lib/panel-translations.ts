import { getTranslations } from "next-intl/server";
import { getPanelLocale } from "@/lib/panel-locale";

/** Sunucu tarafında (Server Action, RSC) panel diline göre `Panel` çevirileri. */
export async function getPanelTranslations() {
  const locale = await getPanelLocale();
  return getTranslations({ locale, namespace: "Panel" });
}
