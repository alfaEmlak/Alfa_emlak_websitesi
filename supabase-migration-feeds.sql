-- ============================================================================
-- 101evler / Hangiev XML feed lookup migration (idempotent)
-- ============================================================================
-- Adımlar:
--   1) ref_101_*  ve  ref_hangiev_*  lookup tabloları
--   2) public.listings tablosuna 101evler ve Hangiev için tip-güvenli kolonlar
--   3) Seed verileri (101evler PDF'i ve mevcut sabitlerden)
--   4) Mevcut ext_101evler / ext_hangiev JSONB değerlerini yeni kolonlara taşıma
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1) Lookup tabloları
-- ----------------------------------------------------------------------------

-- Ortak şablon: id (101evler/hangiev'in verdiği ID), label, sort, is_active
create table if not exists public.ref_101_types (
  id          integer primary key,
  label       text    not null,
  label_en    text,
  sort        integer not null default 0,
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);

create table if not exists public.ref_101_areas (
  id          integer primary key,
  city        text    not null,
  label       text    not null,
  sort        integer not null default 0,
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);
create index if not exists idx_ref_101_areas_city on public.ref_101_areas(city);

create table if not exists public.ref_101_title_types (
  id          integer primary key,
  label       text    not null,
  sort        integer not null default 0,
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);

create table if not exists public.ref_101_room_counts (
  id          integer primary key,
  label       text    not null,
  bedrooms    integer,
  living_rooms integer,
  sort        integer not null default 0,
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);

create table if not exists public.ref_101_build_ages (
  id          integer primary key,
  label       text    not null,
  min_age     integer,
  max_age     integer,
  sort        integer not null default 0,
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);

create table if not exists public.ref_101_furnishing (
  id          integer primary key,
  label       text    not null,
  sort        integer not null default 0,
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);

create table if not exists public.ref_101_billing_cycles (
  id          integer primary key,
  label       text    not null,
  sort        integer not null default 0,
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);

create table if not exists public.ref_101_currencies (
  iso         text    primary key,                -- 'TRY','USD'
  code        integer not null unique,            -- 601, 602
  label       text    not null,
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);

create table if not exists public.ref_101_photo_groups (
  id          integer primary key,
  label       text    not null,
  sort        integer not null default 0,
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);

create table if not exists public.ref_101_ad_specs (
  tag         text    primary key,                -- 'ac','balcony',...
  label_tr    text    not null,
  label_en    text,
  sort        integer not null default 0,
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);

-- Hangiev tarafı (başlangıçta 101evler ile aynı seed; spec gelince ayrı doldurulur)
create table if not exists public.ref_hangiev_property_types (
  id          integer primary key,
  label       text    not null,
  sort        integer not null default 0,
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);

create table if not exists public.ref_hangiev_areas (
  id          integer primary key,
  city        text    not null,
  label       text    not null,
  sort        integer not null default 0,
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);
create index if not exists idx_ref_hangiev_areas_city on public.ref_hangiev_areas(city);

create table if not exists public.ref_hangiev_room_counts (
  id          integer primary key,
  label       text    not null,
  bedrooms    integer,
  living_rooms integer,
  sort        integer not null default 0,
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);

create table if not exists public.ref_hangiev_build_ages (
  id          integer primary key,
  label       text    not null,
  min_age     integer,
  max_age     integer,
  sort        integer not null default 0,
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);

create table if not exists public.ref_hangiev_furnishing (
  id          integer primary key,
  label       text    not null,
  sort        integer not null default 0,
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);

create table if not exists public.ref_hangiev_currencies (
  iso         text    primary key,
  code        text    not null,                   -- Hangiev şu an ISO string kullanıyor
  label       text    not null,
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2) listings tablosuna feed kolonları
-- ----------------------------------------------------------------------------

alter table public.listings
  add column if not exists export_to_101evler   boolean not null default false,
  add column if not exists ext_101evler         jsonb   not null default '{}'::jsonb,
  add column if not exists type_id_101          integer,
  add column if not exists area_id_101          integer,
  add column if not exists title_type_id_101    integer,
  add column if not exists room_count_id_101    integer,
  add column if not exists build_age_id_101     integer,
  add column if not exists furnishing_id_101    integer,
  add column if not exists billing_cycle_id_101 integer,
  add column if not exists price_for_101        char(1),
  add column if not exists reference_no_101     text,

  add column if not exists export_to_hangiev    boolean not null default false,
  add column if not exists ext_hangiev          jsonb   not null default '{}'::jsonb,
  add column if not exists property_type_id_hg  integer,
  add column if not exists area_id_hg           integer,
  add column if not exists room_count_id_hg     integer,
  add column if not exists build_age_id_hg      integer,
  add column if not exists furnishing_id_hg     integer,
  add column if not exists price_for_hg         char(1),
  add column if not exists reference_no_hg      text;

-- price_for kontrolleri
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'listings_price_for_101_chk'
  ) then
    alter table public.listings
      add constraint listings_price_for_101_chk
      check (price_for_101 is null or price_for_101 in ('T','U'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'listings_price_for_hg_chk'
  ) then
    alter table public.listings
      add constraint listings_price_for_hg_chk
      check (price_for_hg is null or price_for_hg in ('T','U'));
  end if;
end $$;

-- FK'lar (lookup silinince listing'i NULL'a düşür)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'listings_type_id_101_fk') then
    alter table public.listings add constraint listings_type_id_101_fk
      foreign key (type_id_101) references public.ref_101_types(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'listings_area_id_101_fk') then
    alter table public.listings add constraint listings_area_id_101_fk
      foreign key (area_id_101) references public.ref_101_areas(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'listings_title_type_id_101_fk') then
    alter table public.listings add constraint listings_title_type_id_101_fk
      foreign key (title_type_id_101) references public.ref_101_title_types(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'listings_room_count_id_101_fk') then
    alter table public.listings add constraint listings_room_count_id_101_fk
      foreign key (room_count_id_101) references public.ref_101_room_counts(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'listings_build_age_id_101_fk') then
    alter table public.listings add constraint listings_build_age_id_101_fk
      foreign key (build_age_id_101) references public.ref_101_build_ages(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'listings_furnishing_id_101_fk') then
    alter table public.listings add constraint listings_furnishing_id_101_fk
      foreign key (furnishing_id_101) references public.ref_101_furnishing(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'listings_billing_cycle_id_101_fk') then
    alter table public.listings add constraint listings_billing_cycle_id_101_fk
      foreign key (billing_cycle_id_101) references public.ref_101_billing_cycles(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'listings_property_type_id_hg_fk') then
    alter table public.listings add constraint listings_property_type_id_hg_fk
      foreign key (property_type_id_hg) references public.ref_hangiev_property_types(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'listings_area_id_hg_fk') then
    alter table public.listings add constraint listings_area_id_hg_fk
      foreign key (area_id_hg) references public.ref_hangiev_areas(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'listings_room_count_id_hg_fk') then
    alter table public.listings add constraint listings_room_count_id_hg_fk
      foreign key (room_count_id_hg) references public.ref_hangiev_room_counts(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'listings_build_age_id_hg_fk') then
    alter table public.listings add constraint listings_build_age_id_hg_fk
      foreign key (build_age_id_hg) references public.ref_hangiev_build_ages(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'listings_furnishing_id_hg_fk') then
    alter table public.listings add constraint listings_furnishing_id_hg_fk
      foreign key (furnishing_id_hg) references public.ref_hangiev_furnishing(id) on delete set null;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 3) Seed: 101evler
-- ----------------------------------------------------------------------------

insert into public.ref_101_types (id, label, sort) values
  (1,'Villa',1), (2,'Daire',2), (3,'İkiz Villa',3), (4,'Müstakil Ev',4),
  (5,'Arsa',5), (6,'Tarla',6), (7,'Dükkan',7), (8,'Hotel',8),
  (9,'Studio',9), (10,'Penthouse',10), (11,'Bungalow',11), (12,'İş Yeri',12),
  (14,'Depo',14), (15,'Devremülk',15), (16,'Komple Bina',16), (17,'Metruk Bina',17),
  (18,'Devren Satılık İşyeri',18), (19,'Ofis',19), (20,'Residence',20), (21,'Yarım İnşaat',21)
on conflict (id) do update set label = excluded.label, sort = excluded.sort, updated_at = now();

insert into public.ref_101_title_types (id, label, sort) values
  (1,'Türk Koçanlı',1), (2,'Eşdeğer Koçanlı',2), (3,'Yabancı Koçanlı',3),
  (4,'Devlet Sosyal Konut',4), (5,'Şehit çocuğu',5), (6,'Tahsis',6),
  (7,'Mücahit Puanı',7), (8,'Leasehold',8)
on conflict (id) do update set label = excluded.label, sort = excluded.sort, updated_at = now();

insert into public.ref_101_room_counts (id, label, bedrooms, living_rooms, sort) values
  (1,'1+0',1,0,1), (2,'1+1',1,1,2), (3,'2+1',2,1,3), (4,'2+2',2,2,4),
  (5,'3+1',3,1,5), (6,'3+2',3,2,6), (7,'4+1',4,1,7), (8,'4+2',4,2,8),
  (9,'5',5,null,9), (10,'5+1',5,1,10), (11,'5+2',5,2,11), (12,'5+3',5,3,12),
  (13,'5+4',5,4,13), (14,'6+1',6,1,14), (15,'6+2',6,2,15), (16,'6+3',6,3,16),
  (17,'6+4',6,4,17), (18,'7+1',7,1,18), (19,'7+2',7,2,19), (20,'7+3',7,3,20),
  (21,'8',8,null,21), (22,'2',2,null,22)
on conflict (id) do update set label = excluded.label, bedrooms = excluded.bedrooms,
  living_rooms = excluded.living_rooms, sort = excluded.sort, updated_at = now();

insert into public.ref_101_build_ages (id, label, min_age, max_age, sort) values
  (10,'0',0,0,1), (1,'1',1,1,2), (2,'2',2,2,3), (3,'3',3,3,4),
  (4,'4',4,4,5), (11,'5',5,5,6),
  (5,'6 - 10',6,10,7), (6,'11 - 15',11,15,8), (7,'16 - 20',16,20,9),
  (8,'21 - 25',21,25,10), (9,'26',26,null,11),
  (12,'Proje Aşamasında',null,null,12)
on conflict (id) do update set label = excluded.label, min_age = excluded.min_age,
  max_age = excluded.max_age, sort = excluded.sort, updated_at = now();

insert into public.ref_101_furnishing (id, label, sort) values
  (1,'Eşyasız',1), (2,'Yarı Eşyalı',2), (3,'Eşyalı',3),
  (4,'Sadece Beyaz Eşya',4), (5,'Ful Eşyalı',5)
on conflict (id) do update set label = excluded.label, sort = excluded.sort, updated_at = now();

insert into public.ref_101_billing_cycles (id, label, sort) values
  (1,'Aylık Ödemeli',1), (2,'3 Aylık Peşin',2), (3,'6 Aylık Peşin',3), (4,'12 Aylık Peşin',4)
on conflict (id) do update set label = excluded.label, sort = excluded.sort, updated_at = now();

insert into public.ref_101_currencies (iso, code, label) values
  ('TRY',601,'Türk Lirası'), ('USD',602,'US Dolar')
on conflict (iso) do update set code = excluded.code, label = excluded.label, updated_at = now();

insert into public.ref_101_photo_groups (id, label, sort) values
  (1,'Dış Görsel',1),(2,'Giriş',2),(3,'Salon',3),(4,'Mutfak',4),(5,'Yatak Odası',5),
  (6,'Banyo',6),(7,'Ebeveyn Banyo',7),(8,'Çocuk Odası',8),(9,'Çalışma Odası',9),
  (10,'Teras',10),(11,'Diğer',11),(12,'Balkon',12),(13,'Oto Park',13),(14,'Garaj',14),
  (15,'Bodrum',15),(16,'Bahçe',16),(17,'Havuz',17),(18,'Kiler',18),(19,'Yemek Odası',19),
  (20,'Tapu Görüntüsü',20),(21,'Kat Planı Görüntüsü',21),(22,'Site Plan',22),
  (23,'Uydu Görüntüsü',23),(24,'Çamaşır Odası',24)
on conflict (id) do update set label = excluded.label, sort = excluded.sort, updated_at = now();

-- 101evler bölgeleri (PDF'den alınmış tüm KKTC bölgeleri)
insert into public.ref_101_areas (id, city, label, sort) values
  -- Lefkoşa
  (198,'Lefkoşa','Akıncılar',10),(9,'Lefkoşa','Alayköy',20),(31,'Lefkoşa','Balıkesir',30),
  (111,'Lefkoşa','Beyköy',40),(12,'Lefkoşa','Cihangir',50),(85,'Lefkoşa','Çağlayan',60),
  (154,'Lefkoşa','Çukurova',70),(29,'Lefkoşa','Değirmenlik',80),(30,'Lefkoşa','Demirhan',90),
  (163,'Lefkoşa','Dilekkaya',100),(10,'Lefkoşa','Dumlupınar',110),(103,'Lefkoşa','Düzova',120),
  (200,'Lefkoşa','Erdemli',130),(150,'Lefkoşa','Gaziköy',140),(147,'Lefkoşa','Gelibolu',150),
  (13,'Lefkoşa','Göçmenköy',160),(180,'Lefkoşa','Gökhan',170),(14,'Lefkoşa','Gönyeli',180),
  (146,'Lefkoşa','Gürpınar',190),(2,'Lefkoşa','Hamitköy',200),(15,'Lefkoşa','Haspolat',210),
  (162,'Lefkoşa','Kalavaç',220),(144,'Lefkoşa','Kanlıköy',230),(183,'Lefkoşa','Kırklar',240),
  (17,'Lefkoşa','Kızılbaş',250),(18,'Lefkoşa','Köşklüçiftlik',260),(19,'Lefkoşa','Kumsal',270),
  (3,'Lefkoşa','Küçük Kaymaklı',280),(20,'Lefkoşa','Lefkoşa Merkez',290),
  (142,'Lefkoşa','Lefkoşa Surlariçi',300),(21,'Lefkoşa','Marmara',310),(22,'Lefkoşa','Meriç',320),
  (16,'Lefkoşa','Metehan',330),(23,'Lefkoşa','Minareliköy',340),(1,'Lefkoşa','Ortaköy',350),
  (25,'Lefkoşa','Sanayi Bölgesi',360),(26,'Lefkoşa','Taşkınköy',370),(145,'Lefkoşa','Türkeli',380),
  (101,'Lefkoşa','Yeniceköy',390),(27,'Lefkoşa','Yenikent',400),(28,'Lefkoşa','Yenişehir',410),
  (32,'Lefkoşa','Yılmazköy',420),
  -- Girne
  (33,'Girne','Ağırdağ',10),(155,'Girne','Akçiçek',20),(34,'Girne','Akdeniz',30),
  (35,'Girne','Alagadi',40),(190,'Girne','Alemdağ',50),(6,'Girne','Alsancak',60),
  (36,'Girne','Arapköy',70),(159,'Girne','Aşağı Girne',80),(37,'Girne','Bahçeli',90),
  (38,'Girne','Bellapais',100),(139,'Girne','Beşparmak',110),(11,'Girne','Boğaz',120),
  (39,'Girne','Çamlıbel',130),(5,'Girne','Çatalköy',140),(109,'Girne','Dağyolu',150),
  (40,'Girne','Dikmen',160),(41,'Girne','Doğanköy',170),(42,'Girne','Edremit',180),
  (43,'Girne','Esentepe',190),(191,'Girne','Geçitköy',200),(44,'Girne','Girne Merkez',210),
  (165,'Girne','Göçeri',220),(113,'Girne','Hisarköy',230),(112,'Girne','Ilgaz',240),
  (89,'Girne','İncesu',250),(45,'Girne','Karaağaç',260),(4,'Girne','Karakum',270),
  (46,'Girne','Karaoğlanoğlu',280),(47,'Girne','Karmi',290),(48,'Girne','Karşıyaka',300),
  (114,'Girne','Kayalar',310),(157,'Girne','Kılıçarslan',320),(156,'Girne','Koruçam',330),
  (102,'Girne','Kozan',340),(117,'Girne','Kömürcü',350),(127,'Girne','Küçük Erenköy',360),
  (49,'Girne','Lapta',370),(50,'Girne','Malatya',380),(51,'Girne','Ozanköy',390),
  (24,'Girne','Pınarbaşı',400),(52,'Girne','Sadrazamköy',410),(179,'Girne','Şirinevler',420),
  (86,'Girne','Taşkent',430),(130,'Girne','Tepebaşı',440),(160,'Girne','Türk Mahallesi',450),
  (88,'Girne','Yeşiltepe',460),(158,'Girne','Yukarı Girne',470),(54,'Girne','Zeytinlik',480),
  -- Gazimağusa
  (55,'Gazimağusa','Akdoğan',10),(141,'Gazimağusa','Akova',20),(149,'Gazimağusa','Alaniçi',30),
  (196,'Gazimağusa','Arıdamı',40),(119,'Gazimağusa','Aslanköy',50),(192,'Gazimağusa','Atlılar',60),
  (152,'Gazimağusa','Aygün',70),(121,'Gazimağusa','Baykal',80),(56,'Gazimağusa','Beyarmudu',90),
  (122,'Gazimağusa','Çanakkale',100),(194,'Gazimağusa','Çınarlı',110),(58,'Gazimağusa','Dörtyol',120),
  (189,'Gazimağusa','Dumlupınar',130),(59,'Gazimağusa','Geçitkale',140),
  (166,'Gazimağusa','Gönendere',150),(123,'Gazimağusa','Gülseren',160),
  (133,'Gazimağusa','Güvercinlik',170),(140,'Gazimağusa','İnönü',180),
  (126,'Gazimağusa','Kaleiçi',190),(7,'Gazimağusa','Karakol',200),
  (131,'Gazimağusa','Korkuteli',210),(184,'Gazimağusa','Kurudere',220),
  (104,'Gazimağusa','Kuzucuk',230),(8,'Gazimağusa','Mağusa Merkez',240),
  (143,'Gazimağusa','Mağusa Surlariçi',250),(195,'Gazimağusa','Mallıdağ',260),
  (125,'Gazimağusa','Maraş',270),(96,'Gazimağusa','Mormenekşe',280),
  (60,'Gazimağusa','Mutluyaka',290),(148,'Gazimağusa','Paşaköy',300),
  (182,'Gazimağusa','Pınarlı',310),(193,'Gazimağusa','Pirhan',320),
  (124,'Gazimağusa','Sakarya',330),(94,'Gazimağusa','Salamis',340),
  (61,'Gazimağusa','Serdarlı',350),(53,'Gazimağusa','Tatlısu',360),
  (203,'Gazimağusa','Tirmen',370),(118,'Gazimağusa','Turunçlu',380),
  (62,'Gazimağusa','Tuzla',390),(188,'Gazimağusa','Türkmenköy',400),
  (181,'Gazimağusa','Ulukışla',410),(65,'Gazimağusa','Vadili',420),
  (197,'Gazimağusa','Yamaçköy',430),(63,'Gazimağusa','Yeni Boğaziçi',440),
  (137,'Gazimağusa','Yıldırım',450),
  -- Güzelyurt
  (186,'Güzelyurt','Akçay',10),(66,'Güzelyurt','Aşağı Bostancı',20),(187,'Güzelyurt','Aydınköy',30),
  (161,'Güzelyurt','Cengizköy',40),(70,'Güzelyurt','Güzelyurt Merkez',50),
  (90,'Güzelyurt','Kalkanlı',60),(202,'Güzelyurt','Serhatköy',70),(185,'Güzelyurt','Yayla',80),
  (74,'Güzelyurt','Yukarı Bostancı',90),(75,'Güzelyurt','Zümrütköy',100),
  -- İskele
  (173,'İskele','Ağıllar',10),(100,'İskele','Altınova',20),(170,'İskele','Ardahan',30),
  (135,'İskele','Avtepe',40),(171,'İskele','Aygün',50),(76,'İskele','Bafra',60),
  (92,'İskele','Bahçeler',70),(84,'İskele','Balalan',80),(168,'İskele','Bogaziçi',90),
  (95,'İskele','Boğaz',100),(64,'İskele','Boğaztepe - Monarga',110),
  (134,'İskele','Boltaşlı',120),(129,'İskele','Büyükkonuk',130),(57,'İskele','Çayırova',140),
  (177,'İskele','Derince',150),(77,'İskele','Dipkarpaz',160),(110,'İskele','Ergazi',170),
  (175,'İskele','Esenköy',180),(78,'İskele','İskele Merkez',190),(153,'İskele','Kaleburnu',200),
  (108,'İskele','Kalecik',210),(120,'İskele','Kantara',220),(128,'İskele','Kaplıca',230),
  (199,'İskele','Kilitkaya',240),(79,'İskele','Kumyalı',250),(172,'İskele','Kurtuluş',260),
  (178,'İskele','Kuruova',270),(167,'İskele','Kuzucuk',280),(93,'İskele','Long Beach',290),
  (80,'İskele','Mehmetçik',300),(107,'İskele','Mersinlik',310),(105,'İskele','Ötüken',320),
  (174,'İskele','Pamuklu',330),(201,'İskele','Sazlıköy',340),(81,'İskele','Sınırüstü',350),
  (99,'İskele','Sipahi',360),(136,'İskele','Taşlıca',370),(106,'İskele','Topçuköy',380),
  (91,'İskele','Turnalar',390),(169,'İskele','Tuzluca',400),(164,'İskele','Yarköy',410),
  (82,'İskele','Yedikonuk',420),(83,'İskele','Yeni Erenköy',430),(176,'İskele','Yeşilköy',440),
  (132,'İskele','Ziyamet',450),
  -- Lefke
  (67,'Lefke','Doğancı',10),(68,'Lefke','Gaziveren',20),(69,'Lefke','Gemikonağı',30),
  (71,'Lefke','Lefke',40),(72,'Lefke','Yedidalga',50),(73,'Lefke','Yeşilırmak',60),
  (151,'Lefke','Yeşilyurt',70)
on conflict (id) do update set city = excluded.city, label = excluded.label, sort = excluded.sort, updated_at = now();

-- Ad specs (boolean tag listesi)
insert into public.ref_101_ad_specs (tag, label_tr, sort) values
  ('ac','Klima',10),('balcony','Balkon',20),('barbeku','Barbekü',30),
  ('bounding_wall','Banyo',40),('builtin_kitchen','Panjur',50),('ceramic','Sınır Duvarları',60),
  ('cift_cam','Çift Cam',70),('city_view','Şehir Manzarası',80),('closed_park','Kapalı Otopark',90),
  ('closet','Gömme Dolap',100),('east_face','Doğu Cepheli',110),
  ('electrical_infrastructure','Elektrik Altyapısı',120),('entryphone','Diafon',130),
  ('fire_alarm','Yangın Alarmı',140),('fireplace','Şömine',150),('garage','Garaj',160),
  ('garden','Bahçe',170),('generator','Jeneratör',180),('in_city','Şehir İçi',190),
  ('kepenk','Kepenk',200),('kartonpiyer','Kartonpiyer',210),('laundry','Çamaşır Odası',220),
  ('lift','Asansör',230),('loft_sende_kat','Sende Katlı',240),('master_bath','Ebeveyn WC',250),
  ('master_cabinnet','Ebeveyn Dolabı',260),('mountain_view','Dağ Manzarası',270),
  ('nature_view','Doğa / Yeşillik Manzaralı',280),('new','Yeni',290),
  ('north_face','Kuzey Cepheli',300),('panel_door','Panel Kapı',310),('parquet','Parke',320),
  ('park','Havuz',330),('private_pool','Özel Havuz',340),('public_pool','Ortak Havuz',350),
  ('road','Yol',360),('sari_tas','Sarı Taş Ev',370),('sea_front','Denize Sıfır',380),
  ('sea_view','Deniz Manzarası',390),('security_cam','Güvenlik Kamerası',400),
  ('shower','Duş',410),('solar_electric','Solar Elektrik Üretimi',420),
  ('south_face','Güney Cepheli',430),('steel_door','Çelik Kapı',440),
  ('su_kuyusu','Su Kuyusu',450),('terrace','Teras',460),
  ('thermal_insulation','Isı Yalıtımı',470),('tv_infrastructure','TV Altyapısı',480),
  ('vestiyer','Vestiyer',490),('wallpaper','Duvar Kağıdı',500),
  ('water_booster','Su Pompası',510),('water_infrastructure','Su Yalıtımı',520),
  ('water_tank','Su Deposu',530),('west_face','Batı Cephesi',540)
on conflict (tag) do update set label_tr = excluded.label_tr, sort = excluded.sort, updated_at = now();

-- ----------------------------------------------------------------------------
-- 4) Seed: Hangiev (101evler ile aynı set, hangiev şeması netleşene kadar)
-- ----------------------------------------------------------------------------

insert into public.ref_hangiev_property_types (id, label, sort)
select id, label, sort from public.ref_101_types
where id in (1,2,3,4,5,6,7,8,9,10,11,12,14,16,19,20)
on conflict (id) do update set label = excluded.label, sort = excluded.sort, updated_at = now();

insert into public.ref_hangiev_areas (id, city, label, sort)
select id, city, label, sort from public.ref_101_areas
on conflict (id) do update set city = excluded.city, label = excluded.label, sort = excluded.sort, updated_at = now();

insert into public.ref_hangiev_room_counts (id, label, bedrooms, living_rooms, sort)
select id, label, bedrooms, living_rooms, sort from public.ref_101_room_counts
on conflict (id) do update set label = excluded.label, bedrooms = excluded.bedrooms,
  living_rooms = excluded.living_rooms, sort = excluded.sort, updated_at = now();

insert into public.ref_hangiev_build_ages (id, label, min_age, max_age, sort)
select id, label, min_age, max_age, sort from public.ref_101_build_ages
on conflict (id) do update set label = excluded.label, min_age = excluded.min_age,
  max_age = excluded.max_age, sort = excluded.sort, updated_at = now();

insert into public.ref_hangiev_furnishing (id, label, sort)
select id, label, sort from public.ref_101_furnishing
on conflict (id) do update set label = excluded.label, sort = excluded.sort, updated_at = now();

insert into public.ref_hangiev_currencies (iso, code, label) values
  ('EUR','EUR','Euro'),('TRY','TRY','Türk Lirası'),
  ('GBP','GBP','İngiliz Sterlini'),('USD','USD','US Dolar')
on conflict (iso) do update set code = excluded.code, label = excluded.label, updated_at = now();

-- ----------------------------------------------------------------------------
-- 5) Mevcut JSONB değerlerini yeni kolonlara taşı
--    (kolon zaten doluysa korur, NULL ise JSONB'den okur)
-- ----------------------------------------------------------------------------

update public.listings l set
  type_id_101          = coalesce(l.type_id_101,          nullif((l.ext_101evler->>'type_id'),'')::int),
  area_id_101          = coalesce(l.area_id_101,          nullif((l.ext_101evler->>'area_id'),'')::int),
  title_type_id_101    = coalesce(l.title_type_id_101,    nullif((l.ext_101evler->>'title_type_id'),'')::int),
  room_count_id_101    = coalesce(l.room_count_id_101,    nullif((l.ext_101evler->>'room_count_id'),'')::int),
  build_age_id_101     = coalesce(l.build_age_id_101,     nullif((l.ext_101evler->>'build_age_id'),'')::int),
  furnishing_id_101    = coalesce(l.furnishing_id_101,    nullif((l.ext_101evler->>'furnishing_id'),'')::int),
  billing_cycle_id_101 = coalesce(l.billing_cycle_id_101, nullif((l.ext_101evler->>'billing_cycle_id'),'')::int),
  price_for_101        = coalesce(l.price_for_101,        nullif((l.ext_101evler->>'price_for'),'')),
  reference_no_101     = coalesce(l.reference_no_101,     nullif((l.ext_101evler->>'reference_no'),''))
where l.ext_101evler is not null and jsonb_typeof(l.ext_101evler) = 'object';

update public.listings l set
  property_type_id_hg = coalesce(l.property_type_id_hg, nullif((l.ext_hangiev->>'property_type_id'),'')::int),
  area_id_hg          = coalesce(l.area_id_hg,          nullif((l.ext_hangiev->>'area_id'),'')::int),
  room_count_id_hg    = coalesce(l.room_count_id_hg,    nullif((l.ext_hangiev->>'room_count_id'),'')::int),
  build_age_id_hg     = coalesce(l.build_age_id_hg,     nullif((l.ext_hangiev->>'build_age_id'),'')::int),
  furnishing_id_hg    = coalesce(l.furnishing_id_hg,    nullif((l.ext_hangiev->>'furnishing_id'),'')::int),
  price_for_hg        = coalesce(l.price_for_hg,        nullif((l.ext_hangiev->>'price_for'),'')),
  reference_no_hg     = coalesce(l.reference_no_hg,     nullif((l.ext_hangiev->>'reference_no'),''))
where l.ext_hangiev is not null and jsonb_typeof(l.ext_hangiev) = 'object';

-- ----------------------------------------------------------------------------
-- Bitti.
-- ----------------------------------------------------------------------------
