-- ============================================================
-- İlan aktarımı (danışman devri)
-- ============================================================
-- Amaç: Bir danışman ayrıldığında ilanlarını başka danışmana toplu devretmek.
--
-- Devir yalnızca created_by_agent_id'yi değiştirmez; feed'ler danışman
-- bilgisini ilanın kendi consultant_* kolonlarından okuduğu için
-- (hangiev-builder.ts consultant_name/phone/whatsapp/email) bu alanlar da
-- birlikte güncellenir. Aksi hâlde portallara eski danışmanın iletişim
-- bilgisi gitmeye devam eder.
--
-- agent_locked: 101evler içe aktarımı (scripts/import-101evler.ts) listing_id
-- üzerinden upsert yaptığı için devredilen ilanların danışmanını feed'deki
-- first_realtor adına göre geri yazıyordu. Bu bayrak açıkken içe aktarım
-- danışman alanlarına dokunmaz — "yapışkan gönderim bayrağı" ile aynı mantık.

alter table public.listings
  add column if not exists agent_locked boolean not null default false;

comment on column public.listings.agent_locked is
  'true ise 101evler içe aktarımı bu ilanın danışman alanlarını (created_by_agent_id, created_by_name, consultant_*) ezmez. İlan aktarımı ekranı bu bayrağı açar.';

-- Panelde "kilitli ilanlar" filtresi ve içe aktarımın atlama sorgusu için.
create index if not exists listings_agent_locked_idx
  on public.listings (agent_locked)
  where agent_locked = true;

-- ──────────────────────────────────────────────────────────────
-- DOĞRULAMA
-- ──────────────────────────────────────────────────────────────
-- Kilitli ilan sayısı (devir yapılmadan önce 0 beklenir):
-- select count(*) from listings where agent_locked;
--
-- Danışman alanları tutarsız kalan ilan var mı? (0 beklenir)
-- select l.listing_id, l.created_by_name, l.consultant_name, a.name
-- from listings l join agents a on a.id = l.created_by_agent_id
-- where l.consultant_name is distinct from a.name;
