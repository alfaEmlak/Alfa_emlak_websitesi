import { cookies } from "next/headers";
import { routing } from "@/i18n/routing";
import { getPanelSession } from "@/lib/panel-auth";

export const PANEL_LOCALE_COOKIE = "panel_locale";

function isSupported(locale: string): locale is (typeof routing.locales)[number] {
  return routing.locales.includes(locale as (typeof routing.locales)[number]);
}

/** Panel ve giriş sayfası için seçilen dil (oturum + çerez). */
export async function getPanelLocale(): Promise<(typeof routing.locales)[number]> {
  try {
    const session = await getPanelSession();
    if (session.panelLocale && isSupported(session.panelLocale)) {
      return session.panelLocale;
    }
  } catch {
    /* SESSION_SECRET vb. */
  }

  const jar = await cookies();
  const fromCookie = jar.get(PANEL_LOCALE_COOKIE)?.value;
  if (fromCookie && isSupported(fromCookie)) {
    return fromCookie;
  }

  return routing.defaultLocale;
}
