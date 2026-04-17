# /plan - Admin CRM & Leads

Bu plan, Admin Panel'de basit seviyede bulunan "Mesajlar" bölümünü daha gelişmiş bir **Mini CRM (Müşteri İlişkileri Yönetimi)** sistemine dönüştürmek için hazırlanmıştır. Hedef, potansiyel müşterilerin (Leads) durumunu, hangi danışmanın onlarla ilgilendiğini ve alınan notları uçtan uca takip etmektir.

## 📝 1. Bağlam / Sorun Tespiti
Şu anki sistemde müşteri formları `ContactMessage` modeline düşmekte ve panlede sadece okunup silinebilecek düz bir liste halinde (`MessageList.tsx`) gösterilmektedir. 
Bir emlak ofisinin sıcak satış fırsatlarını yönetebilmesi için "Yeni", "Arandı", "Sunum Yapıldı" gibi aşama (status) takibine, "Bu müşteriyle kim ilgileniyor?" atamasına (agent assignment) ve müşteriyle yapılan görüşmelerin notlarını yazacağı bir alana ihityacı vardır.

## 🚧 2. Sokratik Kapı (Socratic Gate)
- "Model ismi değiştirilmeli mi?" -> Hayır. Siteden form dolduranlar zaten var olan `ContactMessage` API rotasını kullanıyor. Bu tabloyu genişletmek (extend) veritabanı kararlılığını korur.
- "Görünüm nasıl olmalı?" -> Bir CRM paneline (örneğin Kanban tarzı yan yana listeler veya sağ panelde Müşteri Detayında "Durum" ve "Notlar" girebileceğimiz geliştirilmiş bir arayüz) geçilmeli.
- "Danışmanlar bağlanmalı mı?" -> Evet, `Agent` modeli zaten var. Gelen form bir danışmana atanabilmeli.

## 📋 3. Task Breakdown (Görev Dağılımı)

### Görev 1: Prisma Schema Genişletmesi
- **Hedef:** `prisma/schema.prisma`
- **Aksiyon:** 
  `ContactMessage` tablosuna aşağıdaki sütunlar eklenecek:
  - `status` (String): Varsayılan değer "NEW". (NEW, CONTACTED, PRESENTED, CLOSED_WON, CLOSED_LOST)
  - `agentId` (String?): İsteğe bağlı, formu devralan/atanan emlak danışmanının ID'si. `Agent` modeline relation kurulacak.
  - `notes` (String?): Paneli kullananların müşteri hakkında girdiği özel notlar (örn: "Bütçesi kısıtlı, haftaya Pazar tekrar aranacak").

### Görev 2: Veritabanı Migrasyonu
- **Aksiyon:** `npx prisma db push` ile SQLite veri tabanına kolonlar yansıtılacak ve TS client güncellenecek (`npx prisma generate`).

### Görev 3: Server Actions Güncellemesi
- **Hedef:** `app/karealfaadmin/module-actions.ts`
- **Aksiyon:** 
  - `updateMessageStatus(id, status)` fonksiyonu eklenecek.
  - `updateMessageNotes(id, notes)` fonksiyonu eklenecek.
  - `assignMessageToAgent(id, agentId)` fonksiyonu eklenecek.

### Görev 4: Mesajlar Panosu (CRM Arayüzü) Tasarımı
- **Hedef:** `app/karealfaadmin/(panel)/mesajlar/MessageList.tsx`
- **Aksiyon:** 
  - Sağ detay sütununun tasarımı iyileştirilecek.
  - Müşterinin statüsünü seçmek için renkli badge özellikli bir "Durum (Status)" Select kutusu konulacak.
  - Alt kısıma Müşteri Notları (`textarea`) ve "Kaydet" butonu eklenecek.
  - Eğer zaman yeterli gelirse Danışman (Agent) atama dropdown listesi forma eklenecek (tüm Agent'lar fetch edilerek).

## 🛡 4. Verifikasyon (Verification Checklist)
- [ ] Gelen bir mesaja Not yazılabiliyor mu ve yazılan not DB'de saklanarak geri gelindiğinde okunabiliyor mu?
- [ ] Müşterinin durumu "New" yerine "Contacted" veya "Closed" gibi aşamalara geçebiliyor mu?
- [ ] (Opsiyonel) Mesaj bir Agent'a atanabiliyor mu?
