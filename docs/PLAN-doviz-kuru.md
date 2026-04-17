# Sundoviz.com Anlık Döviz Kuru Entegrasyonu

## Bağlam
KKTC'nin sundoviz.com döviz bürosundan anlık kurları çekip ana sayfada göstermek istiyoruz.

**API Endpoint:** `https://online.sundoviz.com/services/apirates.php?app=online`

**Dönen JSON yapısı:**
```json
{
  "exra": { "SunDovizApi": "3.0", "update_time": "2026-04-17 16:47:52" },
  "online": {
    "kur": {
      "usd_alis": "44.65", "usd_satis": "44.98",
      "eur_alis": "52.60", "eur_satis": "53.25",
      "gbp_alis": "60.40", "gbp_satis": "61.10"
    }
  }
}
```

## Yaklaşım: ISR + Statik Kur Kartı
- Next.js API Route (`/api/doviz`) sundoviz API'yi proxy eder
- `revalidate: 300` (5 dk) ile cache'lenir
- Ana sayfada şık bir döviz kuru şeridi gösterilir

## Görev Listesi

### Görev 1: API Route Oluştur
**Dosya (YENİ):** `app/api/doviz/route.ts`
- Sundoviz API'den kurları fetch et
- Hata durumunda fallback değerler döndür
- 5 dakika ISR cache'le

### Görev 2: Döviz Kuru Bileşeni
**Dosya (YENİ):** `components/site/ExchangeRateTicker.tsx`
- TL bazında USD, EUR, GBP kurlarını gösteren şık bir bar/kart
- Son güncelleme zamanını göster
- Sitenin mevcut tasarım diline uygun olacak

### Görev 3: Ana Sayfaya Entegre Et
**Dosya:** `app/[locale]/(site)/page.tsx`
- ExchangeRateTicker bileşenini uygun yere ekle

## Doğrulama
- [ ] `/api/doviz` endpoint'i JSON döndürüyor mu?
- [ ] Ana sayfada döviz kurları görünüyor mu?
- [ ] 5 dakika sonra kurlar güncelleniyor mu?
