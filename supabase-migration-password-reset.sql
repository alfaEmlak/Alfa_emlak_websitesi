-- "Şifremi unuttum" akışı: e-posta ile tek kullanımlık sıfırlama token'ları
-- Supabase SQL Editor'de bir kez çalıştırın.

create table if not exists password_reset_tokens (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid references agents(id) on delete cascade,
  email text not null,
  token_hash text not null,
  expires_at timestamp with time zone not null,
  used_at timestamp with time zone,
  created_at timestamp with time zone default now()
);
create index if not exists idx_pwreset_token_hash on password_reset_tokens(token_hash);
create index if not exists idx_pwreset_email on password_reset_tokens(email);

alter table password_reset_tokens enable row level security;
