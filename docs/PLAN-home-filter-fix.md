# /plan - Home Page Filter Fix

Bu doküman proje yönetim asistanı (project-planner) tarafından kullanıcının isteği üzerine oluşturulmuştur. Ana sayfadaki (`HeroSearch.tsx`) gelişmiş arama / filtreleme fonksiyonunun beklenen sonuçları vermemesi (veya hiç çalışmaması) sorununun tespitlerini ve çözüm adımlarını içerir.

## 📝 1. Bağlam / Sorun Tespiti (Context Check)
Kullanıcı `HeroSearch` bileşeninden "İlanları Gör" butonuna bastığında URL tarafına birçok parametre (örn: `tur`, `emlak`, `sehir`, `bolge`, `minFiyat` vb.) başarıyla aktarılıyor (örnek log: `GET /tr/ilanlar?tur=satilik&emlak=arsa&sehir=iskele&bolge=long-beach`). 
Ancak, `/ilanlar/page.tsx` içerisinde çağrılan API iki önemli hatadan dolayı doğru filtreleme yapamıyor:
1. **Atlanan Parametreler (Missing Filters):** `HeroSearch` ile yollanan gelişmiş filtreler (`minM2`, `maxM2`, `isitma`, `esyali`, `ozellikler`) `lib/listings-query.ts` içerisindeki `buildListingFilters` fonksiyonunda **es geçilmiş (yazılmamış)**.
2. **Kırık Pagination (Broken Count):** `countPublished` fonksiyonu, fiyat (`price`) filtresini ve diğer filtreleri sorguya katmadığı için toplam sayfa sayısı ile çıkan sonuç uyşmazlığı yaşıyor.
3. **Supabase `.or` Sentaks Hatası:** `region` alanında içerisinde boşluk barındıran isimler (Örn: "Long Beach") arandığında `query.or('region.ilike.%Long Beach%')` şeklinde boşluklu string gönderildiği için Supabase/PostgREST sorgusu çöküyor (syntax error) ve sonuç 0 (`[]`) dönüyor. Boşlukların ve özel karakterlerin tırnakla escape edilmesi gerekiyor.

## 🚧 2. Sokratik Kapı (Socratic Gate)
Aşağıdaki konular teknik planlama kapsamında ele alınmıştır:
- "Gelişmiş filtreler eklendiğinde bunları nasıl veritabanı sorgusuna dönüştürmeliyiz?"
- "Boşluk içeren ilçe isimlerini PostgREST syntax'ında güvenli aramak için ne yapmalıyız?"
- "Sayfalama sırasındaki count ve actual query eşitsizliğini nasıl çözebiliriz?"

*Tüm bu sorunların spesifik çözümleri aşağıda tasarlanmıştır.*

## 📋 3. Task Breakdown (Görev Dağılımı)

### Görev 1: `buildListingFilters` Güncellemesi
- **Hedef Dosya:** `lib/listings-query.ts`
- **Aksiyon:** 
  - `HeroSearch`ten gelen `minM2` ve `maxM2` sorgularını `where.areaM2` aralığına çevir (>= min, <= max).
  - `esyali` varsa bunu backend için `where.furnished` olarak geçir.
  - `isitma` ve `ozellikler` parametrelerini (eğer Supabase `features` json arayacaksa) yakalayıp `where.features` dizisi (array/string) olarak dönüştür.

### Görev 2: Supabase Query'leri Hatalarının Giderilmesi (`findPublishedListings` & `countPublished`)
- **Hedef Dosya:** `lib/listings-query.ts`
- **Aksiyon:** 
  - `.or` fonksiyonunu kullanırken boşluklu isimlerin (Örn: "Long Beach") hataya (crash) sebep olmasını engellemek için çift tırnak (quote) escape eklenmeli. Postgrest syntax: `.or(\`region.ilike."%${where.region}%",region.ilike."%${l}%"\`)`. Veya çok daha güvenlisi, raw `or` yerine `eq` ve `in` yaklaşımını kullanmak ya da boşluğu regex/replacer ile elemek.
  - `findPublishedListings` içinde: `where.price`, `where.areaM2`, `where.furnished`, `where.features` property'lerini Supabase query statement'larına bağla (Örn: `if (where.areaM2) { ... }`).
  - `countPublished` fonksiyonuna, `findPublishedListings` içerisindeki tüm filtre kurallarını (fiyat vb.) birebir dahil et ki toplam sayı eşleşsin.

### Görev 3: Gelişmiş Filtre Bileşenlerinin Toparlanması
- **Hedef Dosya:** `app/[locale]/(site)/ilanlar/page.tsx`
- **Aksiyon:** SearchBar'dan submit edilen formdaki gizli input'lara, gelişmiş filtreleri de (minM2, esyali vb.) dahil et veya temizlemesinin doğru çalışıp çalışmadığını doğrula.

## 🛡 4. Verifikasyon (Verification Checklist)
- [ ] Gelişmiş Filtre üzerinden "Arsa" seçip m² filtresi eklendiğinde API filtreleme yapıyor mu?
- [ ] "Long Beach" / "Yeni Erenköy" gibi boşluk barındıran mahalleler hata verdirtmeden filtrede listeleniyor mu?
- [ ] Sayfanın altında çıkan ilan "1 / 4 sayfa" verisi ile "X ilan bulundu" sayısı uyuşuyor ve filtrelerle uyumlu çalışıyor mu?

## 5. Agent Assignments
Bu plan doğrudan **Antigravity (ya da diğer Developer agent)** tarafından `docs/PLAN-home-filter-fix.md` baz alınarak adım adım yürürlüğe alınabilir. 
Geliştirmeye başlamak için `/work docs/PLAN-home-filter-fix.md` çağrısında bulunup bu plana atıf yapınız.
