import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { parseMenuJson } from "@/lib/default-menu";
import { getSiteSettingsOrFallback } from "@/lib/site-settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettingsOrFallback();
  const menu = parseMenuJson(settings.menuJson);

  return (
    <>
      <SiteHeader menu={menu} siteName={settings.siteName} />
      {children}
      <SiteFooter settings={settings} />
    </>
  );
}
