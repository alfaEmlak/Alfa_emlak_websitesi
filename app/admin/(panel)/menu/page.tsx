import { saveMenuJson } from "@/app/admin/actions";
import { defaultMegaMenu } from "@/lib/default-menu";
import { getSiteSettings } from "@/lib/site-settings";
import { MenuEditor } from "@/components/admin/MenuEditor";

export default async function AdminMenuPage() {
  const s = await getSiteSettings();
  const initial = s.menuJson && s.menuJson.trim() ? s.menuJson : JSON.stringify(defaultMegaMenu, null, 2);

  return (
    <div className="p-6 lg:p-10">
      <h1 className="admin-page-title text-3xl font-extrabold">Menü yönetimi</h1>
      <p className="mt-1 text-sm text-[var(--on-surface)]/55">Mega menü yapısı. Geçersiz JSON kaydedilmez; emin değilseniz değiştirmeyin.</p>
      <MenuEditor initial={initial} saveAction={saveMenuJson} />
    </div>
  );
}
