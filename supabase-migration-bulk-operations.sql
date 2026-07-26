-- Toplu işlemler paneli: geri alınabilir silme (çöp kutusu) + toplu işlem denetim kaydı
-- Supabase SQL Editor'de bir kez çalıştırın.

-- 1) Yumuşak silme alanları
-- deleted_at null ise ilan aktiftir. Silme sırasında publish_status 'HIDDEN' yapılır ve
-- eski durum status_before_delete'e yazılır; geri yükleme bu değeri geri koyar.
alter table listings
  add column if not exists deleted_at timestamp with time zone,
  add column if not exists deleted_by_name text,
  add column if not exists status_before_delete text;

-- Aktif ilan sorguları (panel + site) bu kısmi indeksten yararlanır.
create index if not exists listings_not_deleted_idx
  on listings (updated_at desc)
  where deleted_at is null;

-- Çöp kutusu ekranı için.
create index if not exists listings_deleted_at_idx
  on listings (deleted_at desc)
  where deleted_at is not null;

-- 2) Toplu işlem denetim kaydı (süper admin görüntüler)
create table if not exists bulk_operations (
  id uuid primary key default uuid_generate_v4(),
  actor_name text,
  action text not null,
  scope text not null default 'selection',
  filter_json jsonb,
  payload jsonb,
  affected_count integer not null default 0,
  skipped_count integer not null default 0,
  listing_ids jsonb,
  error text,
  created_at timestamp with time zone default now()
);
create index if not exists idx_bulk_operations_created on bulk_operations(created_at desc);
create index if not exists idx_bulk_operations_action on bulk_operations(action);

-- Service role (panel) bu tabloya erişir; RLS'yi açık tutuyoruz.
alter table bulk_operations enable row level security;
