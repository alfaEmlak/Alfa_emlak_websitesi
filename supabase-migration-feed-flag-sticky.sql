-- ============================================================
-- Feed gönderim bayrağını yapılandırmayla senkronize et
-- ============================================================
-- Sorun: Bazı ilanlarda 101evler / hangiev eşleştirmesi (emlak tipi + bölge)
-- dolu olmasına rağmen export_to_* bayrağı DB'de false kalmış. Bu ilanlar
-- sitede yayında ama portallara (101evler/hangiev) gitmiyor.
--
-- Çözüm: Geçerli eşleştirmesi olan (type/area dolu) tüm yayındaki ilanların
-- gönderim bayrağını true'ya çek. Bundan sonra editör de bayrağı "yapışkan"
-- tutuyor (config doluysa kutucuk otomatik işaretli gelir).

-- 101evler: emlak tipi + bölge dolu olan ilanları gönderime aç
update public.listings
set export_to_101evler = true,
    updated_at = now()
where export_to_101evler is distinct from true
  and type_id_101 is not null
  and area_id_101 is not null;

-- hangiev: emlak tipi + bölge dolu olan ilanları gönderime aç
update public.listings
set export_to_hangiev = true,
    updated_at = now()
where export_to_hangiev is distinct from true
  and property_type_id_hg is not null
  and area_id_hg is not null;

-- ──────────────────────────────────────────────────────────────
-- DOĞRULAMA (çalıştırıp kontrol et)
-- ──────────────────────────────────────────────────────────────
-- Config dolu ama hâlâ kapalı kalan var mı? (0 beklenir)
-- select count(*) from listings
--   where type_id_101 is not null and area_id_101 is not null
--     and export_to_101evler is not true;
--
-- select count(*) from listings
--   where property_type_id_hg is not null and area_id_hg is not null
--     and export_to_hangiev is not true;
