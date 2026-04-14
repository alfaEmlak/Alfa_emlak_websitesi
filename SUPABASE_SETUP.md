# Supabase MCP Yapılandırması

## Supabase Projesi Kurulum Adımları

### 1. Supabase Projesi Oluşturun
1. [Supabase](https://supabase.com) adresine gidin
2. "Start your project" butonuna tıklayın
3. GitHub ile giriş yapın
4. Yeni proje oluşturun

### 2. Proje Bilgilerini Alın
1. Supabase Dashboard'da projenize gidin
2. Settings > API bölümüne gidin
3. Aşağıdaki bilgileri kopyalayın:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Veritabanı Şemasını Yükleyin
1. Supabase Dashboard > SQL Editor'a gidin
2. `supabase-schema.sql` dosyasının içeriğini kopyalayın
3. SQL Editor'a yapıştırın ve "Run" butonuna tıklayın

### 4. Storage Bucket Oluşturun
1. Supabase Dashboard > Storage bölümüne gidin
2. "New bucket" butonuna tıklayın
3. Bucket adı: `uploads`
4. Public bucket: ✅ (işaretleyin)
5. Oluşturun

### 5. Storage Policy'leri Ekleyin
Storage > Policies bölümünde `uploads` bucket için aşağıdaki policy'leri ekleyin:

**Policy 1 - Public Read:**
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'uploads');
```

**Policy 2 - Authenticated Upload:**
```sql
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');
```

**Policy 3 - Authenticated Delete:**
```sql
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'uploads');
```

### 6. Environment Değişkenlerini Güncelleyin
`.env` dosyasını açın ve Supabase bilgilerini ekleyin:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

### 7. SQLite'dan Supabase'e Veri Aktarımı (Opsiyonel)

Eğer mevcut SQLite verilerinizi Supabase'e taşımak isterseniz:

```bash
# SQLite verilerini JSON olarak dışa aktar
npx tsx prisma/seed.ts

# Supabase'e aktarım scripti oluşturulacak (sonraki adımda)
```

## Kullanım

### Client-Side (React Components)
```typescript
import { createBrowserSupabaseClient } from '@/lib/supabase'

const supabase = createBrowserSupabaseClient()
const { data, error } = await supabase.from('listings').select('*')
```

### Server-Side (Server Components)
```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data, error } = await supabase.from('listings').select('*')
```

### Admin Operations (Server Actions/API Routes)
```typescript
import { supabaseAdmin } from '@/lib/supabase'

// Bypasses RLS - only use in server-side code
const { data, error } = await supabaseAdmin.from('listings').select('*')
```

### File Upload
```typescript
import { uploadFile } from '@/lib/supabase/storage'

const file = event.target.files[0]
const { path, url } = await uploadFile(file)
```

## Güvenlik Notları

- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` asla client-side kodda kullanılmamalı
- ⚠️ Service key sadece Server Components, Server Actions ve API routes'ta kullanılmalı
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` client-side kullanılabilir
- ✅ Row Level Security (RLS) varsayılan olarak etkindir

## Sorun Giderme

### "Invalid API key" hatası
- `.env` dosyasındaki key'lerin doğru olduğundan emin olun
- Development server'ı yeniden başlatın

### Storage upload hatası
- Bucket'ın public olduğundan emin olun
- Policy'lerin doğru eklendiğini kontrol edin

### RLS policy hatası
- Kullanıcının authenticated olduğundan emin olun
- Policy'lerin doğru yapılandırıldığını kontrol edin
