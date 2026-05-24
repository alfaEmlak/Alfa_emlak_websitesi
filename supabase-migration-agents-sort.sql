-- Danışman (agents) listeleme sırası.
-- Küçük sort_order önce gösterilir; girilmeyenler için 1000 varsayılan.
alter table public.agents
  add column if not exists sort_order integer not null default 1000;

-- İstenen başlangıç sırası (admin panelden sürükle-sırala ile değiştirilebilir).
update public.agents set sort_order = 1  where name = 'Ahmet Denizer';
update public.agents set sort_order = 2  where name = 'Derya Demircioğlu';
update public.agents set sort_order = 3  where name = 'Alfa Özlem';
update public.agents set sort_order = 4  where name = 'Alfa Hazal';
update public.agents set sort_order = 5  where name = 'Umut Hamitoğlu';
update public.agents set sort_order = 6  where name = 'ALFA Belkıs';
update public.agents set sort_order = 7  where name = 'yousra el mabrouki';
