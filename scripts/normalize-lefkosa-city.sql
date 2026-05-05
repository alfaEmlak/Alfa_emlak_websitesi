-- Kuzey Lefkoşa / Nicosia / Lefkoşa yazım varyantlarını tek canonical değere çeker: lefkosa
-- Supabase SQL editor veya psql ile çalıştırın.

UPDATE listings
SET city = 'lefkosa'
WHERE city IS NOT NULL
  AND trim(city) <> ''
  AND (
    trim(city) IN (
      'Lefkoşa',
      'Lefkosa',
      'lefkosha',
      'Kuzey Lefkoşa',
      'Kuzey Lefkosa',
      'kuzey-lefkosa',
      'kuzey lefkosa',
      'North Nicosia',
      'Nicosia',
      'NICOSIA'
    )
    OR lower(trim(city)) IN (
      'lefkoşa',
      'lefkosha',
      'kuzey lefkoşa',
      'kuzey lefkosa',
      'nicosia',
      'north nicosia'
    )
    OR replace(lower(trim(city)), '-', ' ') LIKE '%kuzey%lefko%'
  );
