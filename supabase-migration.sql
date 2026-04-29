-- Supabase listings tablosuna eksik kolonları ekle
-- Bu dosyayı Supabase Dashboard > SQL Editor'da çalıştırın

-- full_address
alter table listings add column if not exists full_address text;

-- map_enabled
alter table listings add column if not exists map_enabled boolean default false;

-- nearby_places (JSON)
alter table listings add column if not exists nearby_places jsonb;

-- nearby_enabled
alter table listings add column if not exists nearby_enabled boolean default false;

-- nearby_poi_categories_json (JSON)
alter table listings add column if not exists nearby_poi_categories_json jsonb;

-- bedrooms
alter table listings add column if not exists bedrooms integer;

-- bathrooms
alter table listings add column if not exists bathrooms integer;

-- area_m2
alter table listings add column if not exists area_m2 decimal(10, 2);

-- plot_area_m2
alter table listings add column if not exists plot_area_m2 decimal(10, 2);

-- floor
alter table listings add column if not exists floor text;

-- building_age
alter table listings add column if not exists building_age integer;

-- living_rooms
alter table listings add column if not exists living_rooms integer;

-- has_pool
alter table listings add column if not exists has_pool boolean default false;

-- has_garden
alter table listings add column if not exists has_garden boolean default false;

-- has_fireplace
alter table listings add column if not exists has_fireplace boolean default false;

-- has_parking
alter table listings add column if not exists has_parking boolean default false;

-- furnished
alter table listings add column if not exists furnished boolean default false;

-- sea_view
alter table listings add column if not exists sea_view boolean default false;

-- detail_fields (JSON)
alter table listings add column if not exists detail_fields jsonb;

-- virtual_tour_enabled
alter table listings add column if not exists virtual_tour_enabled boolean default false;

-- video_enabled
alter table listings add column if not exists video_enabled boolean default false;

-- consultant_office
alter table listings add column if not exists consultant_office text;

-- consultant_photo
alter table listings add column if not exists consultant_photo text;

-- consultant_office_logo
alter table listings add column if not exists consultant_office_logo text;

-- consultant_whatsapp
alter table listings add column if not exists consultant_whatsapp text;

-- stats_show_views
alter table listings add column if not exists stats_show_views boolean default true;

-- stats_show_favs
alter table listings add column if not exists stats_show_favs boolean default true;

-- stats_show_rating
alter table listings add column if not exists stats_show_rating boolean default false;

-- cover_image
alter table listings add column if not exists cover_image text;

-- neighborhood nullable yap (boş olabilir)
alter table listings alter column neighborhood drop not null;

-- description_tr ve description_en nullable yap
alter table listings alter column description_tr drop not null;

-- publish status approval workflow
alter table listings drop constraint if exists listings_publish_status_check;
alter table listings
  add constraint listings_publish_status_check
  check (publish_status in ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'HIDDEN', 'REJECTED'));

-- approval metadata
alter table listings add column if not exists created_by_agent_id uuid references agents(id) on delete set null;
alter table listings add column if not exists created_by_name text;
alter table listings add column if not exists last_updated_by_agent_id uuid references agents(id) on delete set null;
alter table listings add column if not exists last_updated_by_name text;
alter table listings add column if not exists approval_submitted_at timestamp with time zone;
alter table listings add column if not exists approved_by_name text;
alter table listings add column if not exists approved_at timestamp with time zone;
alter table listings add column if not exists rejected_by_name text;
alter table listings add column if not exists rejected_at timestamp with time zone;

-- normalize consultant role naming
update agents set role = 'CONSULTANT' where role = 'AGENT';
alter table agents drop constraint if exists agents_role_check;
alter table agents
  add constraint agents_role_check
  check (role in ('ADMIN', 'CONSULTANT'));

-- initial consultant panel account
insert into agents (name, email, password_hash, title, role, is_active)
values (
  'Panel Danışmanı',
  'consultant.panel@alfa.local',
  'scrypt:20d3305c6a90ecef18cf6d2ff14c76cc:0903f0efbb216115f516f8125ad58510d8ec7a3fe964594ca07e92853fd1e224a35175adfcd03935b6a0b2bd082cddea48fae4d9b225760b35b71357fa60549b',
  'Panel Danışmanı',
  'CONSULTANT',
  true
)
on conflict (email) do nothing;

-- site_settings slider_json (JSON)
alter table site_settings add column if not exists slider_json jsonb;

-- ============================================================================
-- 101evler XML feed entegrasyonu
-- ============================================================================

-- Bu ilan 101evler feed'ine dahil edilsin mi?
alter table listings add column if not exists export_to_101evler boolean not null default false;

-- 101evler-spesifik alanlar (type_id, area_id, room_count_id, build_age_id,
-- furnishing_id, billing_cycle_id, title_type_id, price_for, reference_no)
alter table listings add column if not exists ext_101evler jsonb not null default '{}'::jsonb;

-- Feed sorgusu için partial index
create index if not exists idx_listings_export_101evler
  on listings(export_to_101evler)
  where export_to_101evler = true;

-- Site genel 101evler ayarları (first/second_realtor_id)
alter table site_settings add column if not exists ext_101evler jsonb;

-- ============================================================================
-- Kariyer başvuruları
-- ============================================================================
create table if not exists career_applications (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  message text,
  cv_url text,
  cv_path text,
  cv_filename text,
  is_read boolean not null default false,
  status text not null default 'NEW' check (status in ('NEW', 'REVIEWING', 'INTERVIEW', 'HIRED', 'REJECTED')),
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_career_applications_is_read on career_applications(is_read);
create index if not exists idx_career_applications_created_at on career_applications(created_at desc);

alter table career_applications enable row level security;
create policy "Career apps insert by anyone" on career_applications for insert with check (true);
create policy "Career apps managed by authenticated" on career_applications for all using (auth.role() = 'authenticated');

