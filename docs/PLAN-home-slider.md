# /plan - Home Hero Slider

Bu doküman, kullanıcının talebi üzerine ana sayfadaki statik fotoğrafın (`pexels-tolgaaslanturk-10785667.jpg`), 5 farklı fotoğraf (`kktc_1.jpg` - `kktc_5.jpg`) ile bir slayt gösterisine (carousel/slider) dönüştürülmesi işi için hazırlanmıştır.

## 📝 1. Bağlam / Sorun Tespiti (Context Check)
Mevcut durumda `app/[locale]/(site)/page.tsx` adresinde tek bir `Image` bileşeni kullanılıyor ve bu bileşen `heroImage` değişkeninden (`/pexels-tolgaaslanturk-10785667.jpg`) besleniyor.
Kullanıcı, slider kütüphaneleri (Swiper vb.) olmadan veya projede ekstra bağımlılık oluşturmadan, mevcut görsellerin ("kktc_1.jpg" - "kktc_5.jpg") net (yüksek kalite) ve akıcı ("sanki slaytmış gibi") bir şekilde geçiş yapmasını istiyor.

## 🚧 2. Sokratik Kapı (Socratic Gate)
Aşağıdaki konular teknik planlama kapsamında ele alınmıştır:
- "Görsellerin netliği nasıl sağlanır?" -> Next.js Image bileşenine `quality={100}` parametresi verilerek aşırı sıkıştırma engellenecek.
- "Ek kütüphane eklenmeli mi?" -> Hayır, 5 görsel arasındaki basit "fade" geçişi için React `useState`, `useEffect` ve Tailwind'in `transition-opacity duration-1000` class'ı fazlasıyla yeterli ve performanslı (lightweight) olacaktır.
- "LCP (Largest Contentful Paint) / Performans uyumu" -> Sadece ilk fotoğraf `priority={true}` ile sunulacak, diğer slayt görselleri normal (veya arka planda) yüklenecek ki ilk sayfa açılışı yavaşlamasın.

## 📋 3. Task Breakdown (Görev Dağılımı)

### Görev 1: `HeroSlider` Bileşeninin Oluşturulması
- **Hedef Dosya:** `components/site/HeroSlider.tsx` (Yeni Dosya)
- **Aksiyon:** 
  - `"use client"` etiketi eklenecek.
  - Aldığı `images` array'i üzerinde dönerek tüm fotoğrafları `absolute inset-0` olarak üst üste bindirecek.
  - Aktif index (`currentIndex`) belirlenen saniyede (örn: 5 saniyede bir) artırılacak (`setInterval`).
  - Görseller CSS ile yavaşça (smooth fade) kaybolup belirecek (`opacity-100 z-10` ve `opacity-0 z-0` değişiklikleri).
  - Fotoğraflar `object-cover`, `quality={100}` ile yüksek netlikte sunulacak.

### Görev 2: Ana Sayfadaki Statik Resmin Değiştirilmesi
- **Hedef Dosya:** `app/[locale]/(site)/page.tsx`
- **Aksiyon:** 
  - Sayfada `<div className="absolute inset-0 z-0 overflow-hidden">` içinde bulunan statik `<Image>` etiketi silinecek.
  - Yeni yazılan `<HeroSlider />` bileşeni import edilecek.
  - Bileşene `images={["/kktc_1.jpg", "/kktc_2.jpg", "/kktc_3.jpg", "/kktc_4.jpg", "/kktc_5.jpg"]}` array parametresi geçilecek.

## 🛡 4. Verifikasyon (Verification Checklist)
- [ ] Sayfa yüklendiğinde ilk görsel ("kktc_1.jpg") anında sorunsuz geliyor mu?
- [ ] Belirlenen süre geçtikten sonra diğer resimlere yumuşak bir fade-in efekti ile geçiş oluyor mu?
- [ ] Görsellerin çözünürlük / netlik (quality) kaybı var mı?
- [ ] Konsolda (Hydration error, Warning vb.) hata mevcut mu?
