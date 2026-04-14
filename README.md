# Alfa Emlak Web

Kuzey Kıbrıs odaklı emlak vitrin sitesi ve yönetim paneli. **Next.js 16** (App Router), **React 19**, **Tailwind CSS 4**, **Prisma** ve **SQLite** (geliştirme) kullanır.

## Gereksinimler

- Node.js 20+
- npm (veya uyumlu paket yöneticisi)

## Kurulum

```bash
npm install
```

Kök dizinde `.env` oluşturun — örnek için [`.env.example`](.env.example) dosyasını kopyalayın:

```bash
# macOS / Linux
cp .env.example .env

# Windows (PowerShell veya CMD)
copy .env.example .env
```

`.env` içinde özellikle şunları doldurun:

| Değişken | Açıklama |
|----------|----------|
| `DATABASE_URL` | Geliştirme: `file:./prisma/dev.db` (`.env.example` ile uyumlu) |
| `ADMIN_PASSWORD` | Yönetim paneli giriş şifresi |
| `SESSION_SECRET` | **En az 32 karakter**; oturum şifrelemesi için zorunlu |

Veritabanını migration ile oluşturun:

```bash
npx prisma migrate dev
```

İsteğe bağlı örnek veri:

```bash
npm run db:seed
```

Geliştirme sunucusu (varsayılan port **3000**):

```bash
npm run dev
```

Site: [http://localhost:3000](http://localhost:3000)  
Yönetim paneli girişi: [http://localhost:3000/admin](http://localhost:3000/admin)

Diğer komutlar:

```bash
npm run build   # üretim derlemesi
npm run start   # üretim sunucusu (önce build)
npm run lint    # ESLint
```

İlk kurulumda Prisma istemcisi sorun çıkarırsa: `npx prisma generate`

## Özellik özeti

- Ziyaretçi: ana sayfa, ilan listesi ve filtreler, ilan detayı, hakkımızda, iletişim (iletişim bilgileri; sunucu tarafı form yok).
- Yönetim: ilan CRUD, site ayarları, menü; görseller `POST /api/upload` ile `public/uploads` altına yazılır (yalnızca giriş yapmış admin).
- Yakındaki yerler: OpenStreetMap / Overpass tabanlı API (`/api/nearby-pois`); ek API anahtarı gerekmez.
- TCMB günlük kurları ana sayfada şerit olarak kullanılır (ağ erişimi gerekir).

## Barındırma, veritabanı ve dosya yükleme

**Önerilen çerçeve (karar özeti):**

| Ortam | Veritabanı | Dosya yüklemeleri |
|-------|------------|-------------------|
| **Geliştirme** | SQLite (`prisma/dev.db`) | `public/uploads` — uygundur |
| **Üretim (tek VPS / kalıcı disk)** | SQLite mümkün; eşzamanlı yazım yüksekse **PostgreSQL** tercih edin | Aynı sunucuda `public/uploads` veya ayrı disk; yedekleme planlayın |
| **Üretim (sunucusuz: Vercel vb.)** | **PostgreSQL** (yönetilen DB) | SQLite dosyası kalıcı olmaz; yükleme için **S3, R2, Supabase Storage** vb. nesne depolama gerekir — mevcut `public/uploads` yolu bu ortamda güvenilir değildir |

Prisma şeması şu an `provider = "sqlite"`. PostgreSQL’e geçiş için `schema.prisma` içinde `provider` ve `url` güncellenir, migration’lar hedef DB için yeniden üretilir veya veri taşıma stratejisi uygulanır.

## Önerilen geliştirme öncelikleri (backlog)

İş hedefine göre sırayı siz netleştirin; tipik önerilen sıra:

1. **README / dokümantasyon** — kurulum ve env (bu dosya); üretim checklist’i ekip içi paylaşımı.
2. **Üretim altyapısı** — hedef platforma göre Postgres + kalıcı veya nesne depolamalı upload; `DATABASE_URL` ve deploy pipeline.
3. **Yönetim güvenliği** — güçlü şifre politikası, giriş denemesi sınırlama, gerekirse IP kısıtı veya ileri düzey kimlik (çoklu kullanıcı).
4. **İletişim** — ihtiyaç halinde iletişim formu ve e-posta / CRM entegrasyonu (KVKK ve saklama politikası ile birlikte).
5. **SEO ve ölçüm** — site haritası, yapılandırılmış veri; isteğe bağlı analitik.
6. **Kalite** — kritik akışlar için test (ilan filtreleri, admin CRUD); regresyon riskini azaltır.

## Next.js notu

Bu depo Next.js 16 kullanır; API ve dosya yapısı önceki sürümlerden farklılık gösterebilir. Resmi dokümantasyon: [Next.js Docs](https://nextjs.org/docs).
