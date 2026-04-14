# UI/UX Pro Max Optimizasyon Planı

## Hedef
Vercel Web Interface Guidelines doğrultusunda alfa_emlak web sitesinin erişilebilirlik (a11y), performans, tipografi ve interaktif alanlarının standartlara yükseltilmesi.

## Değişiklik Yapılacak Dosyalar
- `AlfaEmlak_Web/app/(site)/page.tsx`
- `AlfaEmlak_Web/components/site/PropertyCard.tsx`
- `AlfaEmlak_Web/components/site/HeroSearch.tsx`

---

## Aşama 1: Tipografi ve Okunabilirlik (Typography & Handling)
`AlfaEmlak_Web/app/(site)/page.tsx` içerisinde:
1. Kesme işaretleri düzeltilecek (`Kıbrıs'ın` -> `Kıbrıs’ın`).
2. Dev "ALFA" arka plan yazısı ve başlık yapılarında çok dar mobil ekranlarda taşmayı engelleyecek sınıflar eklenecek.
3. 210. satırdaki `Link` "Tüm İlanları İncele" butonu için belirgin `hover` etkileri eklenecek.

---

## Aşama 2: Kartlar ve Animasyon Performansı
`AlfaEmlak_Web/components/site/PropertyCard.tsx` içerisinde:
1. `transition-all` sınıfı tamamen kaldırılıp, sadece hareket eden özellikler listelenecek (Örn: `transition-[transform,filter]`).
2. Tıklanabilir bağlantılar üzerine (özellikle klavye gezintisi için) `focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-secondary/50` gibi erişilebilir odak stilleri entegre edilecek.
3. `prefers-reduced-motion` saygısı için `motion-safe:` ve `motion-reduce:transition-none` entegre edilecek. 

---

## Aşama 3: Arama Kutusu ve Form Alanları
`AlfaEmlak_Web/components/site/HeroSearch.tsx` içerisinde:
1. `Bütçe (max)` input'una `type="number"`, `inputmode="numeric"`, `name="budget"` özellikleri eklenecek. Mobil klavyelerde doğrudan numaratörün açılması sağlanacak.
2. Dropdown ("Neresi?", "Tip") butonlarına klavye dostu, belirgin focus (odaklanma) stilleri verilecek.

---

## Doğrulama Kontrol Listesi (Checklist)
- [ ] Responsive UI bozulmadı.
- [ ] Mobil ekranda fiyat girişinde numara klavyesi açılıyor.
- [ ] "TAB" tuşuyla elementler arasında gezerken klavye odak halkaları görünür halde.
- [ ] `transition-all` projeden temizlendi.

---
**Önerilen Takip:** Bu planı okuyup onayladıysanız, `/work` veya doğrudan "Uygula" komutu ile işlemlere başlayabiliriz.
