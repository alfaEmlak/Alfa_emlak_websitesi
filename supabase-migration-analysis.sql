-- Ana sayfa "Analiz" panelinin admin'den düzenlenebilir değerleri.
-- Tek satırlık site_settings (id=1) tablosuna JSON alan ekler.
alter table public.site_settings
  add column if not exists analysis_json text;
