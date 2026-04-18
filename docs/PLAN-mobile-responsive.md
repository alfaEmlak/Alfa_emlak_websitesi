# Mobil Uyum (Responsive Design) ve Kullanıcı Deneyimi Düzeltmeleri Planı

Bu plan, Alfa Emlak web sitesinin ve admin panelinin farklı ekran boyutlarında, özellikle mobil cihazlarda düzgün ve kullanışlı bir şekilde görüntülenmesi için yapılacak çalışmaları kapsar.

## Hedefler
- Tüm sayfalarda genel duyarlılık (responsiveness - yatay kayma (horizontal scroll) hataları dahil) sorunlarının giderilmesi.
- Mobil cihazlar için Site ana navigasyonunun modern bir "Hamburger Menü" olarak yeniden tasarlanması.
- İlan Detayları, Filtreler ve Arama çubuğunun mobilde kafa karıştırmayacak şekilde sadeliğe kavuşturulması.
- Admin Panelinin (backend/dashboard) tamamen mobil kullanıcı dostu hale getirilmesi.
- Dokunmatik ekranlarda buton ve menü etkileşim boyutlarının en iyi standartlara (touch-friendly) çıkarılması.

---

## Görev Kırılımı (Task Breakdown)

### Aşama 1: Genel Yapı ve Site Ön Yüzü (Frontend) Navigasyonu
- [ ] **Hamburger Menü Entegrasyonu:** `SiteHeader` içindeki geniş menü elemanlarının mobil ekranlarda hamburger ikonu içerisine gizlenmesi ve animasyonlu modern bir açılır menü (drawer/slide-in) sisteminin eklenmesi.
- [ ] **Döviz / Ek Bilgi Barları:** `SundovizRatesStrip.tsx` gibi bilgi şeritlerinin dar ekranlarda taşmayacak veya okunabilir slider (kayan yazı) şeklinde tasarlanması.
- [ ] **Alt Bilgi (Footer):** `SiteFooter.tsx` bileşeninin mobilde linklerin alt alta sıralanacağı (stack) mobil uygun dizilimi.

### Aşama 2: Ana Sayfa ve Tasarım Elemanları
- [ ] **Arama Asistanı:** `HeroSearch.tsx` ve filtreleme alanlarının mobilde üst üste (stack) veya akordeon şeklinde düzenlenerek gereksiz yer kaplamasının önüne geçilmesi.
- [ ] **İlan Kartları:** `PropertyCard.tsx` bileşenindeki grid yapısının ayarlanması (örneğin desktop'ta yan yana 3-4 kartken mobilde dikey tek bir kart) ve resim/yazı oranlarının korunması.
- [ ] **Diğer Hero Elemanları:** `HeroSpotlight.tsx` gibi bölümlerin arayüz orantılarının mobilde görsel kaybı olmadan ölçeklendirilmesi.

### Aşama 3: İç Sayfalar (İlan Detay ve Formlar)
- [ ] **Resim Galerisi:** `PhotoGallery.tsx` bileşeninin mobil formata uygun "swipeable" (kaydırılabilir) tarzı yapılandırılarak resimlere mobilden rahat bakılmasının sağlanması.
- [ ] **İletişim/Talep Formları:** Input'ların ve butonların dokunmatik ekranlara uygun, kolay tıklanabilir (minimum 44x44px) şekilde boyutlandırılması (`ContactForm.tsx`).

### Aşama 4: Admin Panel (Dashboard) Mobil Optimizasyonu
- [ ] **Admin Sidebar:** Admin paneli sol menüsünün mobilde otomatik gizlenmesi, üstte veya altta çıkacak bir hamburger ikon ile tetiklenmesi veya alt bar (bottom tab bar) menüsü haline getirilmesi.
- [ ] **Tablolar ve Veri Gösterimi:** İlan listeleri ve Mesajlar gibi Admin panel tablo yapılarının mobilde yatay kaydırma (horizontal scroll) ile içeriği dışarıya taşırmadan (overflow-hidden / overflow-x-auto) listelenmesi.
- [ ] **Form ve Ayar Ekranları:** Admin panelindeki form düzenleme/ekleme alanlarındaki bileşenlerin tek kolona (single-column) düşürülerek mobil form doldurma işleminin kolaylaştırılması.

---

## Agent Atamaları
- **Antigravity Planlayıcı:** Genel responsive stratejisini oluşturma ve planı dökümante etme (Tamamlandı).
- **Antigravity Geliştirici:** Plandaki adımları Tailwind CSS "Responsive Utility" sınıflarını (sm:, md:, vb.) kullanarak adım adım ilgili bileşenlere entegre etme.
- **Antigravity UI/UX Denetleyici:** Mobil görünümün kalitesini, UI uyumunu ve okunabilirliğini test etme.

---

## Doğrulama Kontrol Listesi (Verification Checklist)
- [ ] Ana sayfa ve alt sayfalarda mobil görünümde hiçbir tasarım patlaması (istenmeyen margin/padding taşmaları) kalmamalı.
- [ ] Hamburger menünün açılıp kapanma etkileşimi (UX) hatasız çalışmalı.
- [ ] Admin panele mobilden girildiğinde tüm içerikler okunmalı, tablolar kullanışlı olmalı ve menü akıcı olmalı.
- [ ] İşaret parmağı ile tüm butonlara kazara yanlış tıklamaya mahal vermeyecek kadar rahat basılabilmeli.
