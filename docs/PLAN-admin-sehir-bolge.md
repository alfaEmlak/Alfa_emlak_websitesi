# Admin Panel Şehir ve Bölge Optimizasyonu

Admin panelinden yeni ilan eklendiğinde veya mevcut bir ilan güncellendiğinde, "Şehir" ve "Bölge" bilgilerinin esnek metinler yerine standartlaştırılmış dropdown (seçim) listelerinden alınmasını sağlayacağız. Bu sayede ilanlar, arama/filtreleme motorundaki hiyerarşik sisteme tam uyum sağlayacak ve filtreler kusursuz çalışacaktır.

## User Review Required

> [!WARNING]
> Veritabanında eski formatta (büyük harflerle ve rastgele metinlerle) yazılmış şehir ve bölge bilgileri olabilir. Bu değişiklik yeni kayıtların ve güncellenen ilanların standart olmasını sağlayacak. Eski kayıtların tamamının yeni "Lefkoşa (lefkosa)" "Gönyeli (gonyeli)" standartlarına dönüştürülmesi için bir veri güncelleyici script (migration) çalıştırmaya gerek duyar mıyız? Şu anki plan sadece ilanları yaratırken ya da editlerken tutarlılığı sağlamak üzerinedir.

## Proposed Changes

### Komponent: Admin Arayüzü

#### [MODIFY] [ListingEditor.tsx](file:///c:/Users/yener/Desktop/PROJELER/alfa_emlak/AlfaEmlak_Web/components/admin/ListingEditor.tsx)
- Mevcut `KKTC_ILCE_ADLARI` kullanımı yerine yeni eklediğimiz `kktcCities` ve `kktcRegions` import edilecek (şema referans dosyası: `@/lib/kktc-regions.ts`).
- `form.city` (Şehir) değiştiğinde, eğer seçilen şehir ile uyumlu olmayan bir `form.region` varsa sıfırlanacak.
- Bölge / Mahalle alanı serbest `<input type="text" />` olmaktan çıkarılıp dinamik bir `<select>` kutusuna dönüşecek. Sadece seçili olan şehrin ilçelerini içeren `kktcRegions[city]` listesi seçenek olarak gösterilecek.
- Veri kayıt fonksiyonlarında, Label (Örn: "Lefkoşa", "Gönyeli") yerine sistemsel Value ("lefkosa", "gonyeli") veya tam tersi, "arama API'sının" desteklediği ve frontend'te gösterim uyumlu olan `value` stringi gönderilecek.

### Dosyalar arası Koordinasyon:
Arama API'sında veya filtre listesinde eski uppercase olan DB kayıt değerlerini veya yeni lowercase id değerlerini tutarlı match etmek için `@/lib/listings-query.ts` içerisindeki `normalizeCity` metodu zaten çalışıyor. Bunu koruyacağız ancak yeni admin kayıtları frontend'teki `value` stiline tam entegre çalışacak.

## Open Questions

> [!IMPORTANT]
> Veritabanına kayıt atılırken şehir/bölge değerlerini ("gonyeli" gibi) sistemsel kimlik (key) olarak mı kaydedelim, yoksa "Gönyeli" (Label) olarak mı kaydedelim? Filtreler URL parametresi üzerinden id formatını kullanıyor. Eğer Value string'i olarak atarsak, frontend listeleme arayüzünde ufak bir haritalama yapmamız gerekebilir (Örn: `gonyeli -> Gönyeli` formatına çevirmek için). Ben "value" key'ini veritabanına kaydetmeyi ve gerektiğinde UI üzerinde label'a formatlamayı öneriyorum.

## Verification Plan

### Manual Verification
1. `/karealfaadmin/ilanlar/yeni` sayfasına gidilir, Şehir dropdown menüsünün doğru illeri getirdiği doğrulanır.
2. Girne seçildiğinde Bölge menüsünde yalnızca Girne semtlerinin (Alsancak, Lapta vb.) çıktığı test edilir.
3. Kayıt (Draft veya Publish) yapıldığında Veritabanına seçilen string değerin doğru ve filtrelenebilir formatta gittiğinden emin olunur.
4. Ana sayfa aramalarında yeni eklenen ilanın "Girne" ve "Alsancak" seçildiğinde doğru sayıda getirilip filtrelendiği test edilir.
