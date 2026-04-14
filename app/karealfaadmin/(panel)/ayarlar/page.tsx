import { saveSiteSettings } from "@/app/karealfaadmin/actions";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getDefaultConsultant, getSocialLinks } from "@/lib/site-settings";
import { MultiLangSettingsFields } from "@/components/admin/MultiLangSettingsFields";

export default async function AdminSettingsPage() {
  const { data: s, error } = await supabaseAdmin
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    // Handle case where settings don't exist yet
  }

  const social = s ? getSocialLinks(s) : {};
  const dc = s ? getDefaultConsultant(s) : {};
  const translations = s?.translations ? JSON.parse(s.translations) : null;

  return (
    <div className="p-6 lg:p-10">
      <h1 className="admin-page-title text-3xl font-extrabold">Site ayarları</h1>
      <p className="mt-1 text-sm text-(--on-surface)/55">Genel site metinleri, iletişim ve SEO.</p>
      <form action={saveSiteSettings} className="mt-8 max-w-3xl space-y-8">
        <section className="admin-card space-y-3 p-6">
          <h2 className="label-sm text-(--primary)/55">Genel</h2>
          <label className="block text-sm">
            Logo URL
            <input name="logoUrl" defaultValue={s?.logoUrl ?? ""} className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20" />
          </label>
        </section>

        <MultiLangSettingsFields initialTranslations={translations} currentSettings={s} />

        <section className="admin-card space-y-3 p-6">
          <h2 className="label-sm text-(--primary)/55">İletişim</h2>
          <label className="block text-sm">
            Telefon
            <input name="phone" defaultValue={s?.phone ?? ""} className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20" />
          </label>
          <label className="block text-sm">
            WhatsApp
            <input name="whatsapp" defaultValue={s?.whatsapp ?? ""} className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20" />
          </label>
          <label className="block text-sm">
            E-posta
            <input name="email" type="email" defaultValue={s?.email ?? ""} suppressHydrationWarning className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20" />
          </label>
        </section>
        <section className="admin-card space-y-3 p-6">
          <h2 className="label-sm text-(--primary)/55">Sosyal</h2>
          <label className="block text-sm">
            Facebook
            <input name="social_facebook" defaultValue={social.facebook ?? ""} className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20" />
          </label>
          <label className="block text-sm">
            Instagram
            <input name="social_instagram" defaultValue={social.instagram ?? ""} className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20" />
          </label>
          <label className="block text-sm">
            LinkedIn
            <input name="social_linkedin" defaultValue={social.linkedin ?? ""} className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20" />
          </label>
          <label className="block text-sm">
            YouTube
            <input name="social_youtube" defaultValue={social.youtube ?? ""} className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20" />
          </label>
        </section>
        <section className="admin-card space-y-3 p-6">
          <h2 className="label-sm text-(--primary)/55">Varsayılan danışman</h2>
          <label className="block text-sm">
            Ad
            <input name="dc_name" defaultValue={dc.name ?? ""} className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20" />
          </label>
          <label className="block text-sm">
            Telefon
            <input name="dc_phone" defaultValue={dc.phone ?? ""} className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20" />
          </label>
          <label className="block text-sm">
            WhatsApp
            <input name="dc_whatsapp" defaultValue={dc.whatsapp ?? ""} className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20" />
          </label>
          <label className="block text-sm">
            E-posta
            <input name="dc_email" type="email" defaultValue={dc.email ?? ""} suppressHydrationWarning className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20" />
          </label>
          <label className="block text-sm">
            Ofis
            <input name="dc_office" defaultValue={dc.office ?? ""} className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20" />
          </label>
          <label className="block text-sm">
            Foto URL
            <input name="dc_photo" defaultValue={dc.photo ?? ""} className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20" />
          </label>
          <label className="block text-sm">
            Logo URL
            <input name="dc_logo" defaultValue={dc.logo ?? ""} className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20" />
          </label>
        </section>
        <button
          type="submit"
          className="btn-tactile rounded-xl bg-(--secondary) px-8 py-3 text-sm font-bold text-white shadow-md shadow-(--secondary)/25 transition hover:bg-brand-hover"
        >
          Kaydet
        </button>
      </form>
    </div>
  );
}
