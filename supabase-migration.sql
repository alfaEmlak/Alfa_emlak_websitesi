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
