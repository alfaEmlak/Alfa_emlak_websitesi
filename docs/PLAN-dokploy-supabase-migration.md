# Supabase → Dokploy (self-host) taşıma runbook'u

**Neden:** Mevcut Supabase projesi (`edioisowmuhhipefyoqq`) `exceed_storage_size_quota`
ihlali nedeniyle kısıtlandı. REST API'nin tamamı HTTP 402 dönüyor, bu yüzden sitede
hiçbir ilan görünmüyor.

**Yaklaşım:** Kodun veri katmanı Postgres'e SQL ile değil, Supabase'in REST API'sine
(PostgREST) konuşuyor — 63 dosyada 218 çağrı noktası. Bu yüzden Dokploy'a **düz Postgres
değil, tam Supabase stack'i** kuruyoruz. Böylece uygulama kodu değişmiyor; sadece
`NEXT_PUBLIC_SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` yeni sunucuyu gösteriyor.

Kapsam dışı: `prisma/` altındaki sqlite kurulumu ölü koddur (`provider = "sqlite"`,
`file:./prisma/dev.db`), prodüksiyonla ilgisi yoktur ve taşınmaz.

---

## 0. Ön koşullar

Supabase dashboard'dan alınacaklar:

| Bilgi | Yer |
|---|---|
| Postgres bağlantı dizesi (**Direct connection**, pooler değil) | Settings → Database → Connection string → URI |
| Postgres sürümü (örn. 15.x / 17.x) | Settings → Infrastructure |
| Storage kullanımı ve bucket listesi | Storage |

Yerelde `pg_dump` kurulu değil; tüm Postgres komutları Docker üzerinden çalıştırılır.
**Dump alan imajın major sürümü, kaynak sunucununkiyle aynı ya da daha yeni olmalıdır.**

---

## 1. Erişimi geri açmak (engel)

Kısıtlama sürerken REST API ve Storage indirmeleri çalışmaz. Aşağıdakilerden biri şart:

- **Storage'dan dosya silerek** kotanın altına inmek (dashboard → Storage), veya
- Planı **geçici olarak yükseltmek** / spend cap'i kaldırmak. Taşıma bittikten sonra
  eski proje kapatılacağı için bu tek seferlik bir maliyettir.

> Doğrudan Postgres bağlantısı (5432) kısıtlama sırasında bazen açık kalır. Önce
> aşağıdaki testi deneyin; çalışıyorsa veritabanı dump'ı için yükseltmeye gerek kalmaz —
> ancak **Storage dosyaları yine de REST üzerinden indirileceği için** erişimin açılması
> gerekir.

Bağlantı testi (`<DIRECT_URL>` yerine dashboard'dan aldığınız URI):

```bash
docker run --rm postgres:17 psql "<DIRECT_URL>" -c "select count(*) from listings;"
```

---

## 2. Veritabanı yedeği

Bağlantı dizesini kabuk geçmişine yazmamak için `.env` dosyasına ekleyin:

```
DIRECT_DATABASE_URL="postgresql://postgres:...@db.edioisowmuhhipefyoqq.supabase.co:5432/postgres"
```

Şema + veri, yalnızca uygulamanın kullandığı `public` şeması:

```bash
docker run --rm -v "$PWD:/backup" -w /backup postgres:17 pg_dump "$DIRECT_DATABASE_URL" --schema=public --no-owner --no-privileges --format=custom --file=db-backup.dump
```

Gözle kontrol edilebilir düz SQL kopyası (isteğe bağlı, ama tavsiye edilir):

```bash
docker run --rm -v "$PWD:/backup" -w /backup postgres:17 pg_dump "$DIRECT_DATABASE_URL" --schema=public --no-owner --no-privileges --file=db-backup.sql
```

**Doğrulama:** `db-backup.sql` içinde `COPY public.listings` satırının ve makul sayıda
veri satırının bulunduğunu teyit edin. Boş bir dump ile devam etmeyin.

---

## 3. Storage yedeği

```bash
node scripts/storage-export.mjs
```

Tüm bucket'ları `./storage-backup/<bucket>/<yol>` altına indirir, `buckets.json` içine
bucket listesini ve `public` bayraklarını yazar. Yeniden çalıştırıldığında mevcut
dosyaları atlar, yani yarıda kalırsa kaldığı yerden devam eder.

**Doğrulama:** çıktıdaki hata sayısı 0 olmalı ve dosya sayısı dashboard'daki bucket
sayımıyla uyuşmalı.

---

## 4. Dokploy'da Supabase kurulumu — YAPILDI (2026-08-24)

Sunucu: `45.196.28.103`, Ubuntu 24.04.1 LTS, 16 GB RAM, 8 vCPU, 97 GB disk.
Dokploy v0.30.2 (`curl -sSL https://dokploy.com/install.sh | sh`).
Adres: `https://db.alfaemlak.net` (Let's Encrypt, Traefik üzerinden).

Resmî compose olduğu gibi kullanılmadı; üç değişiklik zorunluydu:

1. **Veri yolları repo dışına alındı.** Resmî compose Postgres verisini ve Storage
   dosyalarını `./volumes/db/data` ve `./volumes/storage` bind mount'larında tutuyor.
   Dokploy her deploy'da kod dizinini yeniden çektiği için bu, ikinci deploy'da veri
   kaybı demekti. Tüm `./volumes/` yolları `/var/lib/alfa-supabase/volumes/` altına
   taşındı. Compose Dokploy'a **Raw** olarak yapıştırıldı (Git kaynağı değil).
2. **Portlar localhost'a kilitlendi.** `api-gw` 8000, `supavisor` 5432 ve 6543
   varsayılan olarak tüm arayüzlere açılıyordu. Hepsi `127.0.0.1:` ile bağlandı;
   dışarıya yalnızca Traefik 80/443 çıkıyor.
3. **`REALTIME_DB_ENC_KEY` tam 16 karakter olmalı** (AES-128). Daha uzun bir değer
   realtime konteynerini `Bad key size` ile sonsuz restart döngüsüne sokuyor.

Bu sürümde API gateway'in servis adı **`kong` değil `api-gw`** (Envoy'a geçilmiş).
Dokploy domain ayarında servis adı olarak bu yazılır, port 8000.

Sırlar `/root/supabase.env` (mod 600) içinde; örnek dosyadaki hiçbir değer korunmadı.
`DISABLE_SIGNUP=true`, anonim ve telefon kaydı kapalı.

Doğrulama: 11 servis healthy, Postgres 17.6. `/rest/v1/` kök yolu tasarım gereği
yalnızca `service_role`'a açıktır (anon key ile 403 dönmesi normaldir); tablo
sorguları anon key ile çalışır.

---

## 5. Geri yükleme

Postgres dışarıya kapalı olduğu için geri yükleme **sunucu üzerinde** yapılır.
Önce dump'ı sunucuya kopyalayın:

```bash
scp db-backup.dump root@45.196.28.103:/root/
```

Ardından sunucuda, `supabase-db` konteynerinin ağı üzerinden:

```bash
ssh root@45.196.28.103 'docker run --rm --network container:supabase-db -v /root:/backup postgres:17 pg_restore --no-owner --no-privileges --clean --if-exists -h 127.0.0.1 -U postgres -d postgres /backup/db-backup.dump'
```

Şifre sorulduğunda `/root/supabase.env` içindeki `POSTGRES_PASSWORD` kullanılır.

Ardından storage — bu makineden çalıştırılabilir, Storage API HTTPS üzerinden açıktır:

```bash
TARGET_SUPABASE_URL=https://db.alfaemlak.net TARGET_SERVICE_ROLE_KEY=<service_role_key> node scripts/storage-import.mjs
```

**Doğrulama:**

```bash
ssh root@45.196.28.103 'docker exec supabase-db psql -U postgres -c "select publish_status, count(*) from listings group by 1;"'
```

Sayılar eski projedekiyle aynı olmalı.

---

## 6. Görsel URL'lerini yeniden yazma

Veritabanındaki satırlar eski projenin tam URL'lerini saklıyor
(`https://edioisowmuhhipefyoqq.supabase.co/storage/v1/object/public/uploads/...`).
Kodda sabit yazılmış bir domain **yok**, ama veri satırlarının güncellenmesi gerekir.

Önce hangi kolonların etkilendiğini bulun:

```sql
select table_name, column_name
from information_schema.columns
where table_schema = 'public' and data_type in ('text', 'character varying');
```

Bilinen alanlar: `listings.cover_image`, `listing_images.url`. Blog kapakları, danışman
avatarları gibi başka alanlar da olabilir — yukarıdaki listeyi tarayıp teyit edin.

```sql
begin;

update listings
set cover_image = replace(cover_image,
      'https://edioisowmuhhipefyoqq.supabase.co', 'https://db.alfaemlak.net')
where cover_image like 'https://edioisowmuhhipefyoqq.supabase.co%';

update listing_images
set url = replace(url,
      'https://edioisowmuhhipefyoqq.supabase.co', 'https://db.alfaemlak.net')
where url like 'https://edioisowmuhhipefyoqq.supabase.co%';

-- Sayıları kontrol edin, doğruysa:
commit;
```

`app/karealfaadmin/bulk-actions.ts` içindeki `/storage/v1/object/public/uploads/` yol
ayracı her iki kurulumda da aynı olduğu için değişiklik gerektirmez.

---

## 7. Uygulama env değişimi

Render.com tarafında (deploy `alfa-new` remote'undan yapılıyor):

```
NEXT_PUBLIC_SUPABASE_URL=https://db.alfaemlak.net
NEXT_PUBLIC_SUPABASE_ANON_KEY=<yeni anon key>
SUPABASE_SERVICE_ROLE_KEY=<yeni service role key>
```

Yerelde aynı değerleri `.env` içine yazın. Başka kod değişikliği gerekmez.

---

## 8. Doğrulama listesi

- [ ] `/ilanlar` sayfası ilanları listeliyor, sayfalama çalışıyor
- [ ] Ana sayfadaki vitrin ilanları geliyor
- [ ] İlan detay sayfası açılıyor, görseller yükleniyor (404 yok)
- [ ] Admin panelinden yeni görsel yüklenebiliyor (yeni Storage'a yazıyor)
- [ ] Admin panelinden ilan silme, görselleri de siliyor
- [ ] 101evler feed çıktısı doğru görsel URL'leri üretiyor
- [ ] Dokploy'da otomatik Postgres yedeği tanımlı

---

## 9. Geri dönüş planı

Eski Supabase projesini **en az bir hafta silmeyin**. Sorun çıkarsa env değişkenlerini
eski değerlere döndürmek yeterlidir — bu yüzden adım 6'daki URL güncellemesini
transaction içinde yapın ve `db-backup.dump` dosyasını saklayın.

---

## 10. Devralınan sorumluluklar

Self-host ile birlikte Supabase'in üstlendiği işler size geçer:

- **Yedekleme:** Dokploy'un zamanlanmış yedeklemesini kurun ve **geri yüklemeyi bir kez
  test edin.** Test edilmemiş yedek, yedek değildir.
- **Güncelleme:** Supabase imajlarının güvenlik güncellemelerini takip edin.
- **Disk izleme:** Kotayı aşma sorunu ortadan kalkmıyor, sadece sizin diskinize taşınıyor.
  Disk doluluğu için uyarı kurun.
