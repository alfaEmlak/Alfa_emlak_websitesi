# Plan - Alfa Emlak Tam Çoklu Dil (i18n) Entegrasyonu

Bu plan, Alfa Emlak web sitesindeki tüm sayfa ve bileşenlerin 5 dilde (TR, EN, RU, DE, FA) tam uyumlu hale getirilmesini ve ilan verilerinin dinamik olarak çevrilmesini kapsar.

## User Review Required

> [!IMPORTANT]
> Tüm çeviriler AI tarafından profesyonel bazda otomatikleştirilecektir. Farsça için RTL (sağdan sola) düzen desteği kontrol edilecektir.

## Proposed Changes

### 1. Mesaj Kataloglarının Genişletilmesi (JSON)

Mevcut `messages/*.json` dosyaları, ana sayfa tasarımı ve ilan detaylarındaki tüm yeni metinleri içerecek şekilde genişletilecektir.

#### [MODIFY] [tr.json](file:///c:/Users/yener/Desktop/PROJELER/alfa_emlak/AlfaEmlak_Web/messages/tr.json)
- Ana sayfa bölümleri (Neden Biz, Analiz, CTA) eklenecek.
- İlan detay etiketleri (Ekspertiz, Yatak Odası, Banyo vb.) eklenecek.
- SEO meta verileri için anahtarlar eklenecek.

#### [MODIFY] [en.json](file:///c:/Users/yener/Desktop/PROJELER/alfa_emlak/AlfaEmlak_Web/messages/en.json) | [ru.json](file:///c:/Users/yener/Desktop/PROJELER/alfa_emlak/AlfaEmlak_Web/messages/ru.json) | [de.json](file:///c:/Users/yener/Desktop/PROJELER/alfa_emlak/AlfaEmlak_Web/messages/de.json) | [fa.json](file:///c:/Users/yener/Desktop/PROJELER/alfa_emlak/AlfaEmlak_Web/messages/fa.json)
- TR katalogundaki tüm yeni anahtarların karşılıkları AI ile profesyonelce doldurulacak.

### 2. İlan Verisi Çeviri Mantığı (Utility)

Veritabanındaki `Listing.translations` (JSON) alanını kullanarak aktif dile göre veriyi döndüren bir yardımcı fonksiyon eklenecektir.

#### [NEW] [i18n-utils.ts](file:///c:/Users/yener/Desktop/PROJELER/alfa_emlak/AlfaEmlak_Web/lib/i18n-utils.ts)
- `getTranslatedListing(listing, locale)`: Başlık, açıklama ve özellik listesini çevrilen versiyonuyla günceller.

### 3. Sayfaların i18n'e Geçirilmesi

#### [MODIFY] [page.tsx (Home)](file:///c:/Users/yener/Desktop/PROJELER/alfa_emlak/AlfaEmlak_Web/app/[locale]/(site)/page.tsx)
- Tüm statik metinler `useTranslations('HomePage')` ile değiştirilecek.
- Hero ve koleksiyon başlıkları dinamikleştirilecek.

#### [MODIFY] [page.tsx (Detail)](file:///c:/Users/yener/Desktop/PROJELER/alfa_emlak/AlfaEmlak_Web/app/[locale]/(site)/ilan/[listingId]/page.tsx)
- İlan verileri `getTranslatedListing` üzerinden geçirilecek.
- Etiketler (m2, Oda, vb.) çeviri dosyasından çekilecek.

#### [MODIFY] [page.tsx (Archive)](file:///c:/Users/yener/Desktop/PROJELER/alfa_emlak/AlfaEmlak_Web/app/[locale]/(site)/ilanlar/page.tsx)
- Filtreleme başlıkları ve sonuçsuz durum metinleri localize edilecek.

### 4. Bileşenlerin Güncellenmesi

#### [MODIFY] [PropertyCard.tsx](file:///c:/Users/yener/Desktop/PROJELER/alfa_emlak/AlfaEmlak_Web/components/site/PropertyCard.tsx)
- "Satılık/Kiralık" etiketleri ve oda sayıları çevrilecek.

#### [MODIFY] [HeroSearch.tsx](file:///c:/Users/yener/Desktop/PROJELER/alfa_emlak/AlfaEmlak_Web/components/site/HeroSearch.tsx)
- Placeholder metinleri ve butonlar localize edilecek.

## Verification Plan

### Automated Tests
- `npm run build`: Dil yollarının ve mesaj dosyalarının doğrulanması.
- Tarayıcı üzerinden diller arası geçiş yapılarak tüm metinlerin değiştiği teyit edilecek.

### Manual Verification
- Farsça (FA) dilinde sayfa düzeninin RTL olup olmadığının kontrolü.
- İlan detayında çevirisi olan bir ilan için verilerin doğru dilde gelip gelmediğinin kontrolü.
