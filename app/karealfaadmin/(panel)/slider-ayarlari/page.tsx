import { requirePanelUser } from "@/lib/panel-auth";
import { getSiteSettingsOrFallback, getSliderSettings } from "@/lib/site-settings";
import { SliderSettingsForm } from "./SliderSettingsForm";

export const dynamic = "force-dynamic";

export default async function SliderSettingsPage() {
  const user = await requirePanelUser();
  if (user.role !== "ADMIN") {
    return (
      <div className="p-4 sm:p-6 lg:p-10">
        <h1 className="text-2xl font-extrabold sm:text-3xl text-red-600">Yetkisiz Erişim</h1>
        <p className="mt-4 text-sm text-zinc-500">Bu sayfaya sadece adminler erişebilir.</p>
      </div>
    );
  }

  const settingsRaw = await getSiteSettingsOrFallback();
  const sliderSettings = getSliderSettings(settingsRaw);

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Ana Sayfa Slider Ayarları</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ana sayfada arkaplanda dönecek görselleri ve geçiş süresini buradan yönetebilirsiniz.
        </p>
      </div>

      <SliderSettingsForm initialData={sliderSettings} />
    </div>
  );
}
