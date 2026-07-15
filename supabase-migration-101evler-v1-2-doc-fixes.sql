-- 101evler v1.2 dokümanına göre düzeltmeler.
-- Tüm ifadeler idempotent: tekrar çalıştırılabilir.

-- 1. agents tablosuna 101evler realtor ID kolonu
ALTER TABLE agents ADD COLUMN IF NOT EXISTS realtor_id_101 integer;

-- 2. Yeni ilan tipleri (v1.2 dokümanında eklenmiş)
INSERT INTO ref_101_types (id, label, is_active) VALUES
  (22, 'Konut ve Ticari İmarlı Arsa', true),
  (23, 'Ticari İmarlı Arsa', true),
  (24, 'Sanayi İmarlı Arsa', true),
  (25, 'Turizm İmarlı Arsa', true),
  (27, 'Zeytinlik', true)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  is_active = true;

-- 3. Yeni bölgeler (v1.2 dokümanında eklenmiş)
INSERT INTO ref_101_areas (id, label, city, is_active) VALUES
  (210, 'Batıkent',  'Lefkoşa',    true),
  (207, 'Yiğitler',  'Lefkoşa',    true),
  (213, 'Muratağa',  'Gazimağusa', true),
  (211, 'Mevlevi',   'Güzelyurt',  true),
  (206, 'Bağlıköy',  'Lefke',      true),
  (212, 'Taşpınar',  'Lefke',      true)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  city  = EXCLUDED.city,
  is_active = true;

-- 4. Feature tag düzeltmeleri (yanlış eşleşmeler)
-- Mevcut hatalı tag'leri güncelle ve eksikleri ekle
INSERT INTO ref_101_ad_specs (tag, label_tr, is_active) VALUES
  ('bath_check',      'Banyo',           true),
  ('blind',           'Panjur',          true),
  ('bounding_wall',   'Sınır Duvarı',    true),
  ('builtin_kitchen', 'Ankastre Mutfak', true),
  ('ceramic',         'Seramik',         true)
ON CONFLICT (tag) DO UPDATE SET
  label_tr  = EXCLUDED.label_tr,
  is_active = true;
