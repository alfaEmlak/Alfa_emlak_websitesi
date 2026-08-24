/**
 * Yerel yedek → yeni (self-host) Supabase Storage.
 *
 * storage-export.mjs'in ürettiği ./storage-backup ağacını hedef instance'a
 * yükler. Bucket'lar yoksa buckets.json'daki public bayrağıyla oluşturulur.
 *
 * Kullanım:
 *   TARGET_SUPABASE_URL=https://db.alanadi.com \
 *   TARGET_SERVICE_ROLE_KEY=... \
 *   node scripts/storage-import.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./_env.mjs";

const env = loadEnv();
const URL_BASE = env.TARGET_SUPABASE_URL;
const KEY = env.TARGET_SERVICE_ROLE_KEY;
const SRC = path.resolve("storage-backup");

if (!URL_BASE || !KEY) {
  console.error("TARGET_SUPABASE_URL ve TARGET_SERVICE_ROLE_KEY gerekli.");
  process.exit(1);
}
if (!fs.existsSync(SRC)) {
  console.error(`${SRC} yok — önce scripts/storage-export.mjs çalıştırın.`);
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const MIME = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".pdf": "application/pdf",
};

function walk(dir, base = "") {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walk(path.join(dir, e.name), rel));
    else out.push(rel);
  }
  return out;
}

/** Hedefteki mevcut anahtarlari sayfa sayfa toplar (yeniden yuklemeyi atlamak icin). */
async function listExisting(bucket, prefix = "") {
  const keys = new Set();
  const limit = 100;
  let offset = 0;
  for (;;) {
    const res = await fetch(`${URL_BASE}/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix, limit, offset, sortBy: { column: "name", order: "asc" } }),
    });
    if (!res.ok) return keys; // listelenemiyorsa atlama yapmadan devam et
    const page = await res.json();
    for (const i of page) {
      const key = prefix ? `${prefix}/${i.name}` : i.name;
      if (i.id !== null) keys.add(key);
      else for (const k of await listExisting(bucket, key)) keys.add(k);
    }
    if (page.length < limit) break;
    offset += limit;
  }
  return keys;
}

const manifestPath = path.join(SRC, "buckets.json");
const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  : fs.readdirSync(SRC, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => ({ name: e.name, public: true }));

for (const b of manifest) {
  const dir = path.join(SRC, b.name);
  if (!fs.existsSync(dir)) continue;

  const mk = await fetch(`${URL_BASE}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ id: b.name, name: b.name, public: b.public !== false }),
  });
  // Bucket varsa Supabase HTTP 400 + govdede 409 "Duplicate" donebiliyor.
  if (!mk.ok) {
    const body = await mk.text();
    const exists = mk.status === 409 || /409|Duplicate|already exists/i.test(body);
    if (!exists) {
      console.error(`[${b.name}] bucket olusturulamadi: ${mk.status} ${body}`);
      continue;
    }
  }

  const files = walk(dir);
  console.log(`\n[${b.name}] ${files.length} dosya yükleniyor`);
  const existing = env.FORCE_UPLOAD === "1" ? new Set() : await listExisting(b.name);
  let ok = 0;
  let skipped = 0;
  const failed = [];
  for (const key of files) {
    if (existing.has(key)) {
      skipped++;
      continue;
    }
    const buf = fs.readFileSync(path.join(dir, key));
    const ct = MIME[path.extname(key).toLowerCase()] || "application/octet-stream";
    const res = await fetch(`${URL_BASE}/storage/v1/object/${b.name}/${encodeURI(key)}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": ct, "x-upsert": "true", "cache-control": "3600" },
      body: buf,
    });
    if (res.ok) {
      ok++;
      if (ok % 25 === 0) console.log(`  ... ${ok}/${files.length}`);
    } else {
      failed.push({ key, status: res.status, body: (await res.text()).slice(0, 200) });
    }
  }
  console.log(`[${b.name}] ${ok} yuklendi, ${skipped} atlandi, ${failed.length} hata`);
  for (const f of failed) console.error(`  HATA ${f.key}: ${f.status} ${f.body}`);
}
console.log("\nBitti.");
