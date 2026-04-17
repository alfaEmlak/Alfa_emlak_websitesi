# Emlak Filtreleme ve Admin 'Konut Tipi' Yol Haritası

## Mevcut Durumun Teşhisi
Kullanıcının ilettiği üzere:
1. Önceki "Girne" veya diğer şehir adımlarında `.in()` revizyonları yapılmış olmasına rağmen ana sayfa filtreleri (City) beklenen sonucu vermeyip tüm listeyi getiriyor.
2. Admin panelinde `ListingEditor` içinde `propertyType` (Konut, Arsa, Ticari) state'i olmasına rağmen ekranda bir Dropdown eksik. İlan eklendiğinde veya güncellendiğinde mecburen varsayılan değerle gidiyor.
3. Arka planda `listings-query.ts` dosyası detaylıca incelendiğinde; `HeroSearch` formunda toplanan `emlak`, `oda_sayisi` gibi değerler `buildListingFilters` ile obje haline getiriliyor ancak **`findPublishedListings` (veri tabanı query'si) içerisinde bu property'ler SQL condition (eq/ilike) olarak kesinlikle entegre edilmemiş.** Tüm parametreler havaya atılıyor!

## Proposed Changes (Planlanan Değişiklikler)

### Phase 1: Admin Panel Konut Tipi Eksikliğinin Giderilmesi
#### [MODIFY] `components/admin/ListingEditor.tsx`
- Formun içerisine "Emlak/Konut Tipi" (Konut, Ticari, Arsa vb.) için bir `<select>` alanı oluşturulacak.
- Varsayılan tipler (Konut, Ticari, Arsa, vs) listelenecek.
- Veri tabanında halihazırda bulunan (örneğin Capital "Konut" ile lowercase "konut") çakışmalarına engel olmak için value'lar standartlaştırılacak (`konut`, `ticari`, `arsa`).

### Phase 2: Arama Motoru Query'sini Uyandırmak (Ana Nedenler)
#### [MODIFY] `lib/listings-query.ts`
- **Filtrelerin Yok Sayılmasını Çözmek:** `findPublishedListings` ve `countPublished` metotlarında sadece `kind`, `city`, `region`, `price` kullanılmış. `Oda Sayısı (bedrooms)` ve `Konut/Emlak Tipi (propertyType)` filtreleri fonksiyona paslansalar bile sorguda kayboluyorlar.
- Kod bloğunda `query.ilike('propertyType', where.propertyType)` ve `query.eq('bedrooms', where.bedrooms)` eksikleri tamamlanacak.
- `city` için olan `%20` veya harf boyutu boşluk parse sorununu anlamlandırmak adına `query.ilike('city', ...)` kombinasyonlarına bakılacak, gerekiyorsa App Router tarafındaki Cache'in Next.js searchParams sayfasından patlamadığı teyit edilecek.

### Phase 3: Arama Sayfası Next.js URL Cache / SearchParams
#### [INVESTIGATE] `app/ilanlar/page.tsx` veya İlgili Rota
Eğer Next.js App Router içerisinde `searchParams` Promise olmadan okunmaya çalışılıyorsa veya `export const revalidate = 0` konulmamışsa, sayfa Statik Önbellekten geliyor olabilir, bu nedenden dolayı URL'de ?sehir=girne yazsa bile veritabanına sorgu gitmiyor olabilir. Bunu test ve teyit edeceğiz.

---

## Agent Assignments
- **Araştırıcı (Analyzer):** `ilanlar` Page router'in searchParams entegrasyonu incelenecek.
- **Koder (Coder):** `ListingEditor.tsx` ve `listings-query.ts` baştan sona eksik query kurallarıyla revize edilecek.

## Verification Checklist (Doğrulama Adımları)
1. [ ] Admin panel (İlan Ekle/Düzenle) içinde Konut/Arsa/Ticari seçilebiliyor mu? Seçilen veritabanına sorunsuz akıyor mu?
2. [ ] `/ilanlar?sehir=girne` yapıldığında `get()` fonksiyonundan gelen parametre sayfada cache'e takılmadan SQL'e gidiyor mu?
3. [ ] `listings-query.ts` içerisindeki Unused değişkenler `propertyType` ve `bedrooms` arama fonksiyonlarına `add filter` ile bağlandı mı?

# Socratic Gate / Sorular
> Admin panel Konut tiplerinde özellikle satmak istediğiniz sadece Konut, Ticari ve Arsa olarak 3 tip mi vardır? Alt kırılımlar "Müstakil Ev, Daire vb" de olsun ister misiniz yoksa şu anki hali (Ana Kategoriler) yeterli mi?
