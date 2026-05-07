-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Listings table
create table if not exists listings (
  id uuid primary key default uuid_generate_v4(),
  listing_id text unique not null,
  title text not null,
  kind text not null check (kind in ('SATILIK', 'KIRALIK', 'GUNLUK_KIRALIK', 'PROJE')),
  property_type text not null,
  city text not null,
  region text not null,
  neighborhood text not null,
  price decimal(12, 2) not null,
  currency text not null default 'TRY',
  description_tr text not null,
  description_en text,
  features jsonb,
  badges jsonb,
  virtual_tour_url text,
  video_url text,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  publish_status text not null default 'DRAFT' check (publish_status in ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'HIDDEN', 'REJECTED')),
  views integer not null default 0,
  favorites_count integer not null default 0,
  rating decimal(3, 2) not null default 0,
  consultant_name text,
  consultant_phone text,
  consultant_email text,
  consultant_whatsapp text,
  consultant_office text,
  consultant_photo text,
  consultant_office_logo text,
  created_by_agent_id uuid references agents(id) on delete set null,
  created_by_name text,
  last_updated_by_agent_id uuid references agents(id) on delete set null,
  last_updated_by_name text,
  approval_submitted_at timestamp with time zone,
  approved_by_name text,
  approved_at timestamp with time zone,
  rejected_by_name text,
  rejected_at timestamp with time zone,
  translations jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Listing images table
create table if not exists listing_images (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings(id) on delete cascade,
  url text not null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamp with time zone default now()
);

-- Site settings table
create table if not exists site_settings (
  id integer primary key default 1,
  site_name text not null,
  logo_url text,
  contact_phone text,
  contact_email text,
  contact_address text,
  social_json jsonb,
  footer_about text,
  seo_meta_title text,
  seo_meta_description text,
  hero_title text,
  hero_subtitle text,
  default_consultant_json jsonb,
  menu_json jsonb,
  translations jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Contact messages table
create table if not exists contact_messages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  listing_id text,
  is_read boolean not null default false,
  created_at timestamp with time zone default now()
);

-- Blog posts table
create table if not exists blog_posts (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  excerpt text,
  content text not null,
  cover_image text,
  author_name text,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED')),
  translations jsonb,
  published_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Agents table
create table if not exists agents (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text unique not null,
  password_hash text not null,
  phone text,
  whatsapp text,
  photo text,
  title text,
  role text not null default 'CONSULTANT' check (role in ('ADMIN', 'CONSULTANT')),
  is_active boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes
create index if not exists idx_listings_listing_id on listings(listing_id);
create index if not exists idx_listings_kind on listings(kind);
create index if not exists idx_listings_city on listings(city);
create index if not exists idx_listings_publish_status on listings(publish_status);
create index if not exists idx_listings_created_at on listings(created_at desc);

create index if not exists idx_listing_images_listing_id on listing_images(listing_id);
create index if not exists idx_listing_images_primary on listing_images(listing_id, is_primary);

create index if not exists idx_blog_posts_slug on blog_posts(slug);
create index if not exists idx_blog_posts_status on blog_posts(status);
create index if not exists idx_blog_posts_published_at on blog_posts(published_at desc);

create index if not exists idx_contact_messages_is_read on contact_messages(is_read);
create index if not exists idx_contact_messages_created_at on contact_messages(created_at desc);

create index if not exists idx_agents_email on agents(email);
create index if not exists idx_agents_role on agents(role);

-- Create updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Add updated_at triggers
create trigger update_listings_updated_at before update on listings
  for each row execute function update_updated_at_column();

create trigger update_site_settings_updated_at before update on site_settings
  for each row execute function update_updated_at_column();

create trigger update_blog_posts_updated_at before update on blog_posts
  for each row execute function update_updated_at_column();

create trigger update_agents_updated_at before update on agents
  for each row execute function update_updated_at_column();

-- Enable Row Level Security
alter table listings enable row level security;
alter table listing_images enable row level security;
alter table site_settings enable row level security;
alter table contact_messages enable row level security;
alter table blog_posts enable row level security;
alter table agents enable row level security;

-- RLS Policies for listings
create policy "Listings are viewable by everyone" on listings for select using (true);
create policy "Listings can be inserted by authenticated users" on listings for insert with check (auth.role() = 'authenticated');
create policy "Listings can be updated by authenticated users" on listings for update using (auth.role() = 'authenticated');
create policy "Listings can be deleted by authenticated users" on listings for delete using (auth.role() = 'authenticated');

-- RLS Policies for listing_images
create policy "Listing images are viewable by everyone" on listing_images for select using (true);
create policy "Listing images can be managed by authenticated users" on listing_images for all using (auth.role() = 'authenticated');

-- RLS Policies for site_settings
create policy "Site settings are viewable by everyone" on site_settings for select using (true);
create policy "Site settings can be managed by authenticated users" on site_settings for all using (auth.role() = 'authenticated');

-- RLS Policies for contact_messages
create policy "Contact messages can be viewed by authenticated users" on contact_messages for select using (auth.role() = 'authenticated');
create policy "Contact messages can be inserted by anyone" on contact_messages for insert with check (true);
create policy "Contact messages can be updated by authenticated users" on contact_messages for update using (auth.role() = 'authenticated');
create policy "Contact messages can be deleted by authenticated users" on contact_messages for delete using (auth.role() = 'authenticated');

-- RLS Policies for blog_posts
create policy "Blog posts are viewable by everyone when published" on blog_posts for select using (
  status = 'PUBLISHED' or auth.role() = 'authenticated'
);
create policy "Blog posts can be managed by authenticated users" on blog_posts for all using (auth.role() = 'authenticated');

-- RLS Policies for agents
create policy "Agents can be viewed by authenticated users" on agents for select using (auth.role() = 'authenticated');
create policy "Agents can be managed by authenticated users" on agents for all using (auth.role() = 'authenticated');

-- Storage setup (run this separately in Supabase Dashboard > Storage)
-- Note: Create a bucket named 'uploads' with public access
-- Policy: "Public Access" - Allow anyone to view files
-- Policy: "Authenticated Upload" - Allow authenticated users to upload
