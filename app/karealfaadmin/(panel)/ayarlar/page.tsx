import { saveSiteSettings } from "@/app/karealfaadmin/actions";
import { requireAdmin } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getDefaultConsultant, getSocialLinks } from "@/lib/site-settings";
import { MultiLangSettingsFields } from "@/components/admin/MultiLangSettingsFields";

type Ext101Settings = {
  first_realtor_id?: number | string | null;
  second_realtor_id?: number | string | null;
};

type ExtHangievSettings = {
  portal_id?: number | string | null;
  agent_id?: number | string | null;
  office_id?: number | string | null;
};

export default async function AdminSettingsPage() {
  await requireAdmin();
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

  const ext101 = (() => {
    const raw = s?.ext_101evler;
    if (!raw) return { first_realtor_id: "", second_realtor_id: "" };
    let parsed: Ext101Settings = raw as Ext101Settings;
    if (typeof raw === "string") {
      try { parsed = JSON.parse(raw); } catch { parsed = {}; }
    }
    return {
      first_realtor_id: parsed?.first_realtor_id ?? "",
      second_realtor_id: parsed?.second_realtor_id ?? "",
    };
  })();

  const extHangiev = (() => {
    const raw = s?.ext_hangiev;
    if (!raw) return { portal_id: "", agent_id: "", office_id: "" };
    let parsed: ExtHangievSettings = raw as ExtHangievSettings;
    if (typeof raw === "string") {
      try { parsed = JSON.parse(raw); } catch { parsed = {}; }
    }
    return {
      portal_id: parsed?.portal_id ?? "",
      agent_id: parsed?.agent_id ?? "",
      office_id: parsed?.office_id ?? "",
    };
  })();

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
        <section className="admin-card space-y-3 p-6">
          <h2 className="label-sm text-(--primary)/55">101evler entegrasyonu</h2>
          <p className="text-xs text-(--on-surface)/55">
            101evler size atadığında <code>realtor_id</code>&apos;leri buraya girin. ID girilmeden gönderilen XML&apos;de bu alanlar boş kalır.
          </p>
          <label className="block text-sm">
            First realtor ID
            <input
              name="ext101_first_realtor_id"
              type="number"
              inputMode="numeric"
              defaultValue={String(ext101.first_realtor_id ?? "")}
              placeholder="Örn: 1234"
              className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20"
            />
          </label>
          <label className="block text-sm">
            Second realtor ID
            <input
              name="ext101_second_realtor_id"
              type="number"
              inputMode="numeric"
              defaultValue={String(ext101.second_realtor_id ?? "")}
              placeholder="Opsiyonel"
              className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20"
            />
          </label>
          <div className="rounded-lg bg-(--surface)/50 p-3 text-xs text-(--on-surface)/70">
            <p className="font-semibold">Feed URL</p>
            <code className="mt-1 block break-all">/api/feeds/101evler.xml?token=&lt;FEED_101EVLER_TOKEN&gt;</code>
            <p className="mt-2 text-(--on-surface)/55">
              Token <code>.env.local</code> dosyasındaki <code>FEED_101EVLER_TOKEN</code> değerinden alınır. Bu URL&apos;i 101evler hesap yöneticisine verin.
            </p>
          </div>
        </section>

        <section className="admin-card space-y-3 p-6">
          <h2 className="label-sm text-(--primary)/55">Hangiev entegrasyonu</h2>
          <p className="text-xs text-(--on-surface)/55">
            Hangiev size portal, agent veya office ID atarsa buraya girin. Doküman gelene kadar bu alanlar opsiyonel tutulur.
          </p>
          <label className="block text-sm">
            Portal ID
            <input
              name="exthangiev_portal_id"
              defaultValue={String(extHangiev.portal_id ?? "")}
              placeholder="Opsiyonel"
              className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20"
            />
          </label>
          <label className="block text-sm">
            Agent ID
            <input
              name="exthangiev_agent_id"
              defaultValue={String(extHangiev.agent_id ?? "")}
              placeholder="Opsiyonel"
              className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20"
            />
          </label>
          <label className="block text-sm">
            Office ID
            <input
              name="exthangiev_office_id"
              defaultValue={String(extHangiev.office_id ?? "")}
              placeholder="Opsiyonel"
              className="mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20"
            />
          </label>
          <div className="rounded-lg bg-(--surface)/50 p-3 text-xs text-(--on-surface)/70">
            <p className="font-semibold">Feed URL</p>
            <code className="mt-1 block break-all">/api/feeds/hangiev.xml?token=&lt;FEED_HANGIEV_TOKEN&gt;</code>
            <p className="mt-2 text-(--on-surface)/55">
              Token <code>.env.local</code> dosyasındaki <code>FEED_HANGIEV_TOKEN</code> değerinden alınır. Bu URL&apos;i Hangiev hesap yöneticisine verin.
            </p>
          </div>
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
