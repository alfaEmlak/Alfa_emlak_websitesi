/**
 * Supabase Storage → yerel disk yedeği.
 *
 * Kaynak projedeki tüm bucket'ları özyinelemeli gezer ve dosyaları
 * ./storage-backup/<bucket>/<yol> altına indirir. Dizin yapısı korunur,
 * böylece storage-import.mjs aynı anahtarlarla geri yükleyebilir.
 *
 * Kullanım:
 *   node scripts/storage-export.mjs
 *
 * Gerekli env (.env dosyasından okunur):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./_env.mjs";

const env = loadEnv();
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const OUT = path.resolve("storage-backup");

if (!URL_BASE || !KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.");
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function api(pathname, init = {}) {
  const res = await fetch(`${URL_BASE}${pathname}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${init.method || "GET"} ${pathname} → ${res.status}: ${body.slice(0, 300)}`);
  }
  return res;
}

async function listBuckets() {
  const res = await api("/storage/v1/bucket");
  return res.json();
}

/** Bir klasörü sayfa sayfa listeler; dosya ve alt klasörleri ayırır. */
async function listFolder(bucket, prefix) {
  const items = [];
  const limit = 100;
  let offset = 0;
  for (;;) {
    const res = await api(`/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix, limit, offset, sortBy: { column: "name", order: "asc" } }),
    });
    const page = await res.json();
    items.push(...page);
    if (page.length < limit) break;
    offset += limit;
  }
  // Supabase klasörleri id === null ile döner.
  return {
    files: items.filter((i) => i.id !== null),
    folders: items.filter((i) => i.id === null),
  };
}

async function download(bucket, key) {
  const dest = path.join(OUT, bucket, key);
  if (fs.existsSync(dest)) return "skip";
  const res = await api(`/storage/v1/object/${bucket}/${encodeURI(key)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return buf.length;
}

async function walk(bucket, prefix, stats) {
  const { files, folders } = await listFolder(bucket, prefix);
  for (const f of files) {
    const key = prefix ? `${prefix}/${f.name}` : f.name;
    try {
      const r = await download(bucket, key);
      if (r === "skip") {
        stats.skipped++;
      } else {
        stats.count++;
        stats.bytes += r;
        if (stats.count % 25 === 0) console.log(`  ... ${stats.count} dosya`);
      }
    } catch (e) {
      stats.failed.push({ key, error: String(e.message || e) });
    }
  }
  for (const d of folders) {
    await walk(bucket, prefix ? `${prefix}/${d.name}` : d.name, stats);
  }
}

const buckets = await listBuckets();
console.log(`${buckets.length} bucket bulundu: ${buckets.map((b) => b.name).join(", ")}`);

const manifest = [];
for (const b of buckets) {
  console.log(`\n[${b.name}] indiriliyor (public=${b.public})`);
  const stats = { count: 0, skipped: 0, bytes: 0, failed: [] };
  await walk(b.name, "", stats);
  console.log(
    `[${b.name}] ${stats.count} indirildi, ${stats.skipped} atlandı, ` +
      `${(stats.bytes / 1024 / 1024).toFixed(1)} MB, ${stats.failed.length} hata`,
  );
  for (const f of stats.failed) console.error(`  HATA ${f.key}: ${f.error}`);
  manifest.push({ name: b.name, public: b.public, fileCount: stats.count, failed: stats.failed });
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "buckets.json"), JSON.stringify(manifest, null, 2));
console.log(`\nBitti → ${OUT}  (bucket listesi: storage-backup/buckets.json)`);
