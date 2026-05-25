-- 101evler para birimi lookup'una EUR ve GBP ekler.
-- Sorun: ref_101_currencies'te yalnızca TRY (601) ve USD (602) vardı; EUR/GBP
-- fiyatlı ilanlar "101evler para birimi kodu" hatası veriyordu.
--
-- NOT: 601/602 dışındaki kodlar (EUR=603, GBP=604) 101evler'den resmî olarak
-- teyit edilmedi (lib/feeds/101evler-constants.ts uyarısına bakın). Feed
-- reddedilirse 101evler'in verdiği gerçek kodlarla 'code' değerini güncelleyin.

insert into ref_101_currencies (iso, code, label, is_active)
values
  ('EUR', 603, 'Euro', true),
  ('GBP', 604, 'İngiliz Sterlini', true)
on conflict (iso) do update
  set code = excluded.code,
      label = excluded.label,
      is_active = true;
