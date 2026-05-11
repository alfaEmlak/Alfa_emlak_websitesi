import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";

export default async function GizlilikPage() {
  const tc = await getTranslations("Common");

  return (
    <main className="mx-auto max-w-[1440px] flex-1 bg-surface px-6 py-16 md:px-8 md:py-24">
      <nav className="font-headline text-xs uppercase tracking-widest text-on-surface/45">
        <Link href="/" className="hover:text-secondary">
          {tc("home")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-primary">Gizlilik Politikası</span>
      </nav>

      <div className="mt-10 max-w-3xl">
        <span className="label-sm block text-secondary" style={{ fontSize: "11px", letterSpacing: "0.12em" }}>
          YASAL
        </span>
        <h1 className="mt-4 font-headline text-4xl font-extrabold tracking-tight text-primary md:text-5xl">
          Gizlilik Politikası
        </h1>

        <div className="mt-10 space-y-6 text-base leading-relaxed text-on-surface/65">
          <p>
            Alfa Emlak olarak, siz değerli kullanıcılarımızın gizliliğine önem veriyoruz. Bu Gizlilik Politikası, internet
            sitemizi ziyaret ettiğinizde veya hizmetlerimizden faydalandığınızda toplanan kişisel verilerin nasıl işlendiğini,
            saklandığını ve korunduğunu açıklar.
          </p>

          <h2 className="mt-10 font-headline text-2xl font-extrabold text-primary">1. Toplanan Bilgiler</h2>
          <p>
            İletişim formları, ilan başvuruları ve danışmanlık talepleri aracılığıyla; ad-soyad, e-posta adresi, telefon
            numarası ve mesaj içeriği gibi bilgiler tarafımızca toplanabilir. Site kullanımı sırasında çerezler ve benzeri
            teknolojiler aracılığıyla cihaz ve tarayıcı bilgileri de toplanabilir.
          </p>

          <h2 className="mt-10 font-headline text-2xl font-extrabold text-primary">2. Bilgilerin Kullanım Amacı</h2>
          <p>
            Toplanan kişisel veriler; talep ve sorularınızın yanıtlanması, ilan eşleştirme ve danışmanlık hizmetlerinin
            sunulması, hizmet kalitesinin artırılması, yasal yükümlülüklerin yerine getirilmesi amaçlarıyla kullanılır.
          </p>

          <h2 className="mt-10 font-headline text-2xl font-extrabold text-primary">3. Bilgi Paylaşımı</h2>
          <p>
            Kişisel verileriniz, açık rızanız olmaksızın üçüncü kişilerle paylaşılmaz. Yasal mercilerin talebi veya
            zorunluluğu hâlinde ilgili mevzuat çerçevesinde paylaşım yapılabilir.
          </p>

          <h2 className="mt-10 font-headline text-2xl font-extrabold text-primary">4. Çerezler</h2>
          <p>
            İnternet sitemiz, kullanıcı deneyimini iyileştirmek amacıyla çerezler kullanır. Tarayıcı ayarlarınızdan çerezleri
            yönetebilir veya devre dışı bırakabilirsiniz.
          </p>

          <h2 className="mt-10 font-headline text-2xl font-extrabold text-primary">5. Veri Güvenliği</h2>
          <p>
            Kişisel verileriniz, yetkisiz erişime, kayba ve değişikliklere karşı uygun teknik ve idari tedbirlerle korunur.
          </p>

          <h2 className="mt-10 font-headline text-2xl font-extrabold text-primary">6. Haklarınız</h2>
          <p>
            KVKK kapsamında verilerinize erişme, düzeltme, silinmesini talep etme ve işleme itiraz etme haklarına sahipsiniz.
            Detaylı bilgi için <Link href="/kvkk" className="font-semibold text-secondary hover:underline">KVKK Aydınlatma Metni</Link>
            'ni inceleyebilir veya <Link href="/iletisim" className="font-semibold text-secondary hover:underline">iletişim</Link>
            sayfası üzerinden bize ulaşabilirsiniz.
          </p>

          <p className="mt-12 text-sm italic text-on-surface/45">
            Son güncelleme: {new Date().toLocaleDateString("tr-TR", { year: "numeric", month: "long" })}
          </p>
        </div>
      </div>
    </main>
  );
}
