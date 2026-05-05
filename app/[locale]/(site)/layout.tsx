import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { AiSalesAssistant } from "@/components/site/AiSalesAssistant";
import { parseMenuJson } from "@/lib/default-menu";
import { getSiteSettingsOrFallback } from "@/lib/site-settings";
import { getTranslatedSiteSettings } from "@/lib/i18n-utils";

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function SiteLayout({ children, params }: Props) {
  const { locale } = await params;
  const rawSettings = await getSiteSettingsOrFallback();
  const settings = getTranslatedSiteSettings(rawSettings, locale);
  
  const menu = parseMenuJson(settings.menuJson);

  return (
    <>
      <SiteHeader menu={menu} siteName={settings.siteName} />
      {children}
      <SiteFooter settings={settings} />
      <AiSalesAssistant locale={locale} />
    </>
  );
}
