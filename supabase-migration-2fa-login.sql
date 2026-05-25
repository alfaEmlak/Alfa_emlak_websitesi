-- 2FA (e-posta kodu) + zorunlu şifre değişimi + giriş geçmişi
-- Supabase SQL Editor'de bir kez çalıştırın.

-- 1) Geçici şifre ile ilk girişte zorunlu şifre değişimi bayrağı
alter table agents
  add column if not exists must_change_password boolean not null default false;

-- 2) Giriş doğrulama kodları (her girişte üretilir, tek kullanımlık)
create table if not exists login_codes (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid references agents(id) on delete cascade,
  email text not null,
  role text not null,
  code_hash text not null,
  expires_at timestamp with time zone not null,
  used_at timestamp with time zone,
  created_at timestamp with time zone default now()
);
create index if not exists idx_login_codes_email on login_codes(email);
create index if not exists idx_login_codes_expires on login_codes(expires_at);

-- 3) Giriş geçmişi (süper admin görüntüler)
create table if not exists login_events (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid references agents(id) on delete set null,
  actor_name text,
  role text not null,
  email text,
  ip text,
  user_agent text,
  created_at timestamp with time zone default now()
);
create index if not exists idx_login_events_created on login_events(created_at desc);
create index if not exists idx_login_events_agent on login_events(agent_id);

-- Service role (panel) bu tablolara erişir; RLS'yi açık tutuyoruz.
alter table login_codes enable row level security;
alter table login_events enable row level security;
