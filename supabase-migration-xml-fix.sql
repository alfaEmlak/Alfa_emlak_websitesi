-- ============================================================
-- 101evler XML uyum düzeltmesi
-- Gerçek 101evler XML export'u ile karşılaştırma sonrası
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1) PARA BİRİMİ KODLARI DÜZELTMESİ
--    Gerçek XML: GBP = 601. Bizde yanlış olarak TRY=601, GBP=604 vardı.
--    Doğru eşleme: GBP=601, USD=602, EUR=603, TRY=604
-- ──────────────────────────────────────────────────────────────

-- Önce geçici bir code kullan ki unique constraint çakışmasın
update public.ref_101_currencies set code = 9601 where iso = 'TRY';
update public.ref_101_currencies set code = 9604 where iso = 'GBP';

-- Şimdi doğru değerleri ata
update public.ref_101_currencies set code = 601, updated_at = now() where iso = 'GBP';
update public.ref_101_currencies set code = 604, updated_at = now() where iso = 'TRY';

-- EUR yoksa ekle, varsa güncelle
insert into public.ref_101_currencies (iso, code, label, is_active)
values ('EUR', 603, 'Euro', true)
on conflict (iso) do update
  set code = 603, label = 'Euro', is_active = true, updated_at = now();

-- ──────────────────────────────────────────────────────────────
-- 2) ÖDEME DÖNEMİ (billing_cycle_id) DÜZELTMESİ
--    Gerçek XML: 5=Aylık, 6=3 Aylık, 7=6 Aylık, 8=12 Aylık
--    Bizde yanlış olarak 1-4 vardı.
-- ──────────────────────────────────────────────────────────────

-- 2a) Önce listings tablosundaki FK constraint'i geçici kaldır
alter table public.listings drop constraint if exists listings_billing_cycle_id_101_fk;

-- 2b) Mevcut ilanların billing_cycle_id_101 değerlerini 1-4'ten 5-8'e güncelle
update public.listings set billing_cycle_id_101 = billing_cycle_id_101 + 4
where billing_cycle_id_101 in (1, 2, 3, 4);

-- 2c) Eski ext_101evler JSONB içindeki billing_cycle_id değerlerini de güncelle
update public.listings
set ext_101evler = jsonb_set(
  ext_101evler,
  '{billing_cycle_id}',
  to_jsonb((ext_101evler->>'billing_cycle_id')::int + 4)
)
where ext_101evler is not null
  and jsonb_typeof(ext_101evler) = 'object'
  and (ext_101evler->>'billing_cycle_id')::int in (1, 2, 3, 4);

-- 2d) ref_101_billing_cycles tablosunu güncelle
delete from public.ref_101_billing_cycles where id in (1, 2, 3, 4);

insert into public.ref_101_billing_cycles (id, label, sort) values
  (5, 'Aylık Ödemeli', 1),
  (6, '3 Aylık Peşin', 2),
  (7, '6 Aylık Peşin', 3),
  (8, '12 Aylık Peşin', 4)
on conflict (id) do update
  set label = excluded.label, sort = excluded.sort, updated_at = now();

-- 2e) FK constraint'i tekrar ekle
alter table public.listings
  add constraint listings_billing_cycle_id_101_fk
  foreign key (billing_cycle_id_101)
  references public.ref_101_billing_cycles(id)
  on delete set null;

-- ──────────────────────────────────────────────────────────────
-- 3) FİYAT DÖNEMİ (price_period) TABLOSU
--    Gerçek XML'de var: price_period_id 3="1 Yıl", 5="6 Ay"
--    Bu yeni bir tablo, henüz yoktu.
-- ──────────────────────────────────────────────────────────────

create table if not exists public.ref_101_price_periods (
  id          integer primary key,
  label       text    not null,
  sort        integer not null default 0,
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);

insert into public.ref_101_price_periods (id, label, sort) values
  (3, '1 Yıl', 1),
  (5, '6 Ay', 2)
on conflict (id) do update
  set label = excluded.label, sort = excluded.sort, updated_at = now();

-- ──────────────────────────────────────────────────────────────
-- 4) DOĞRULAMA SORGULARI (çalıştırıp kontrol et)
-- ──────────────────────────────────────────────────────────────

-- Para birimleri doğru mu?
-- select * from ref_101_currencies order by code;
-- Beklenen: GBP=601, USD=602, EUR=603, TRY=604

-- Billing cycles doğru mu?
-- select * from ref_101_billing_cycles order by sort;
-- Beklenen: 5=Aylık, 6=3 Aylık, 7=6 Aylık, 8=12 Aylık

-- Price periods oluştu mu?
-- select * from ref_101_price_periods order by sort;
-- Beklenen: 3=1 Yıl, 5=6 Ay

-- Eski billing_cycle_id kalmadı mı?
-- select count(*) from listings where billing_cycle_id_101 in (1,2,3,4);
-- Beklenen: 0
