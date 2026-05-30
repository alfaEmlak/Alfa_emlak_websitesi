import { saveAiTraining } from "@/app/karealfaadmin/actions";
import { requireAdmin } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAiAssistantSettings } from "@/lib/site-settings";

const inputCls =
  "mt-1 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20";

export default async function AiTrainingPage() {
  await requireAdmin();

  const { data: s } = await supabaseAdmin
    .from("site_settings")
    .select("ai_system_prompt, ai_model")
    .eq("id", 1)
    .single();

  const ai = getAiAssistantSettings(s);

  return (
    <div className="p-6 lg:p-10">
      <h1 className="admin-page-title text-3xl font-extrabold">AI Eğitimi</h1>
      <p className="mt-1 text-sm text-(--on-surface)/55">
        Alfi (yapay zeka emlak asistanı) için persona, üslup ve satış yaklaşımını buradan düzenleyin.
      </p>

      <form action={saveAiTraining} className="mt-8 max-w-3xl space-y-8">
        <section className="admin-card space-y-3 p-6">
          <h2 className="label-sm text-(--primary)/55">Persona &amp; üslup talimatı</h2>
          <p className="text-xs text-(--on-surface)/55">
            Buraya yazdıklarınız, asistanın sabit çalışma kurallarına <strong>ek olarak</strong> uygulanır.
            Örn: ton (sıcak/profesyonel), öne çıkarılacak konular, kampanya mesajları, hangi soruların sorulacağı.
            Boş bırakırsanız varsayılan davranış kullanılır.
          </p>
          <label className="block text-sm">
            Talimat metni
            <textarea
              name="ai_system_prompt"
              rows={12}
              maxLength={6000}
              defaultValue={ai.systemPrompt}
              placeholder={
                "Örnek:\n" +
                "- Sıcak, samimi ama profesyonel bir dil kullan.\n" +
                "- Müşteriye önce bütçe ve lokasyon sor.\n" +
                "- Girne ve Lefkoşa projelerini öne çıkar.\n" +
                "- Uygun ilan bulunca danışmanla görüşmeyi teklif et."
              }
              className={inputCls}
            />
          </label>
          <p className="text-[11px] text-(--on-surface)/45">En fazla 6000 karakter.</p>
        </section>

        <section className="admin-card space-y-3 p-6">
          <h2 className="label-sm text-(--primary)/55">Model (opsiyonel)</h2>
          <p className="text-xs text-(--on-surface)/55">
            Boş bırakılırsa sunucudaki varsayılan model (<code>GEMINI_MODEL</code>) kullanılır. Yalnızca ne yaptığınızı biliyorsanız değiştirin.
          </p>
          <label className="block text-sm">
            Model adı
            <input name="ai_model" defaultValue={ai.model} placeholder="gemini-2.5-flash" className={inputCls} />
          </label>
        </section>

        <section className="admin-card space-y-2 p-6">
          <h2 className="label-sm text-(--primary)/55">Değiştirilemeyen güvenlik kuralları</h2>
          <p className="text-xs text-(--on-surface)/55">
            Aşağıdaki kurallar her zaman geçerlidir ve buradan değiştirilemez (asistanın bozulmaması için):
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-(--on-surface)/70">
            <li>Asla uydurma ilan önermez; yalnızca veritabanındaki gerçek ilanları gösterir.</li>
            <li>Kullanıcının yazdığı dilde yanıt verir.</li>
            <li>İlan arama, ilan açma ve iletişim formu akışını yönetir.</li>
            <li>Bir ilan sayfasındayken o ilan hakkında konuşur.</li>
          </ul>
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
