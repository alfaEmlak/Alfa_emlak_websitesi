import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";

export default async function KvkkPage() {
  const tc = await getTranslations("Common");

  return (
    <main className="mx-auto max-w-[1440px] flex-1 bg-surface px-6 py-16 md:px-8 md:py-24">
      <nav className="font-headline text-xs uppercase tracking-widest text-on-surface/45">
        <Link href="/" className="hover:text-secondary">
          {tc("home")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-primary">KVKK Aydınlatma Metni</span>
      </nav>

      <div className="mt-10 max-w-3xl">
        <span className="label-sm block text-secondary" style={{ fontSize: "11px", letterSpacing: "0.12em" }}>
          YASAL
        </span>
        <h1 className="mt-4 font-headline text-4xl font-extrabold tracking-tight text-primary md:text-5xl">
          KVKK Aydınlatma Metni
        </h1>

        <div className="mt-10 space-y-6 text-base leading-relaxed text-on-surface/65">
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, Alfa Emlak olarak veri sorumlusu sıfatıyla,
            kişisel verilerinizin işlenmesine ilişkin sizleri bilgilendirmek isteriz.
          </p>

          <h2 className="mt-10 font-headline text-2xl font-extrabold text-primary">1. Veri Sorumlusu</h2>
          <p>
            İşbu aydınlatma metni kapsamında veri sorumlusu Alfa Emlak&apos;tır. İletişim bilgilerimize{" "}
            <Link href="/iletisim" className="font-semibold text-secondary hover:underline">
              iletişim
            </Link>{" "}
            sayfasından ulaşabilirsiniz.
          </p>

          <h2 className="mt-10 font-headline text-2xl font-extrabold text-primary">2. İşlenen Kişisel Veriler</h2>
          <p>
            Site üzerinden ileteceğiniz form, ilan başvurusu, danışmanlık talebi gibi etkileşimlerde; kimlik bilgileriniz
            (ad-soyad), iletişim bilgileriniz (telefon, e-posta) ve talep içerikleri işlenebilir.
          </p>

          <h2 className="mt-10 font-headline text-2xl font-extrabold text-primary">3. İşleme Amaçları</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Talep ve şikayetlerin değerlendirilmesi ve yanıtlanması</li>
            <li>İlan eşleştirme ve gayrimenkul danışmanlığı hizmetlerinin sunulması</li>
            <li>Sözleşmesel ve yasal yükümlülüklerin yerine getirilmesi</li>
            <li>Hizmet kalitesinin ve müşteri memnuniyetinin artırılması</li>
          </ul>

          <h2 className="mt-10 font-headline text-2xl font-extrabold text-primary">4. Aktarım</h2>
          <p>
            Kişisel verileriniz; yasal düzenlemelerin öngördüğü kişi, kurum ve kuruluşlara, hizmet aldığımız iş ortaklarımıza
            (örn. barındırma, mesajlaşma altyapısı), açık rızanız bulunması halinde üçüncü kişilere aktarılabilir.
          </p>

          <h2 className="mt-10 font-headline text-2xl font-extrabold text-primary">5. Toplama Yöntemi ve Hukuki Sebep</h2>
          <p>
            Kişisel verileriniz; internet sitesi, e-posta, telefon ve fiziki ortamlar aracılığıyla; sözleşmenin kurulması ve
            ifası, meşru menfaat, kanuni yükümlülük ve açık rıza hukuki sebeplerine dayanılarak toplanır.
          </p>

          <h2 className="mt-10 font-headline text-2xl font-extrabold text-primary">6. KVKK Madde 11 Kapsamındaki Haklarınız</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>İşlenen verileriniz hakkında bilgi talep etme</li>
            <li>Verilerin işlenme amacını ve buna uygun kullanılıp kullanılmadığını öğrenme</li>
            <li>Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme</li>
            <li>Verilerin silinmesini veya yok edilmesini isteme</li>
            <li>İşlemlerin yapıldığı üçüncü kişilere bildirilmesini isteme</li>
            <li>Otomatik sistemlerle yapılan analize itiraz etme</li>
            <li>Verilerin kanuna aykırı işlenmesi nedeniyle uğradığınız zararın giderilmesini talep etme</li>
          </ul>

          <p>
            Haklarınızı kullanmak için{" "}
            <Link href="/iletisim" className="font-semibold text-secondary hover:underline">
              iletişim
            </Link>{" "}
            sayfası üzerinden bizimle iletişime geçebilirsiniz.
          </p>

          <p className="mt-12 text-sm italic text-on-surface/45">
            Son güncelleme: {new Date().toLocaleDateString("tr-TR", { year: "numeric", month: "long" })}
          </p>
        </div>
      </div>
    </main>
  );
}
