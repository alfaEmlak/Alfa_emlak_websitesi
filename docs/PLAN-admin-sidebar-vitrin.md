# Admin Panel Kullanılabilirlik İyileştirmesi + Vitrin Yönetimi

## Bağlam
Admin panelin mevcut menüsü düz bir liste halinde ve yazılım bilmeyen bir kullanıcı için kafa karıştırıcı. Ayrıca ana sayfada hangi ilanların "öne çıkan" olacağını seçmek kolay değil.

## Yapılacaklar

### Görev 1: AdminSidebar Gruplama
**Dosya:** `components/admin/AdminSidebar.tsx`

Mevcut düz menü listesini şu kategorilere ayır:
- **ANA SAYFA** → Özet
- **İLANLAR** → Tüm İlanlar, Yeni İlan, Vitrin İlanları (YENİ)
- **İLETİŞİM** → Gelen Kutusu
- **İÇERİK** → Blog, Menü
- **YÖNETİM** → Danışmanlar, Site Ayarları

Her grubun üstüne küçük gri bir başlık etiketi koyulacak.

### Görev 2: "Vitrin İlanları" Sayfası
**Dosya (YENİ):** `app/karealfaadmin/(panel)/ilanlar/vitrin/page.tsx`

Bu sayfa:
- Yayında olan tüm ilanları listeler (başlık, fiyat, şehir, kapak fotoğrafı)
- Her ilanın yanında bir toggle (switch) bulunur → "Öne Çıkar" on/off
- Toggle açıldığında `badges` JSON'daki `featured: true` yapılır
- Toggle kapatıldığında `featured: false` yapılır

### Görev 3: Vitrin Toggle Server Action
**Dosya:** `app/karealfaadmin/actions.ts`

`toggleFeatured(listingId, featured: boolean)` server action fonksiyonu eklenecek. Mevcut `badges` JSON'unu okuyup sadece `featured` alanını güncelleyecek.

## Doğrulama
- [ ] Sidebar'da gruplar görünüyor mu?
- [ ] "Vitrin İlanları" sayfası menüden erişilebiliyor mu?
- [ ] Toggle ile bir ilan öne çıkarılıp kaldırılabiliyor mu?
- [ ] Ana sayfada öne çıkan ilanlar doğru görünüyor mu?
