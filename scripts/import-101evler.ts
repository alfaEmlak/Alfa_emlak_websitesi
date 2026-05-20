/**
 * 101evler XML → Supabase `listings` içe aktarma.
 *
 * 101evler'in bize verdiği export dosyasını (kendi ilanlarımız) okuyup DRAFT
 * olarak Supabase'e aktarır. Eşleme lib/feeds/101evler-import.ts içindedir.
 *
 * Kullanım:
 *   # Dosyadan, DRY-RUN (hiçbir şey yazmaz, sadece özet):
 *   npx tsx --env-file=.env scripts/import-101evler.ts "C:\\path\\export.xml"
 *
 *   # Feed URL'sinden, DRY-RUN:
 *   npx tsx --env-file=.env scripts/import-101evler.ts "https://.../feed.xml"
 *
 *   # Gerçekten yaz (upsert + görseller):
 *   npx tsx --env-file=.env scripts/import-101evler.ts "...xml" --commit
 *
 * Notlar:
 *   - listing_id = "101-<property_id>" (mevcut manuel ilanlarla çakışmaz).
 *   - Tekrar çalıştırma güvenli: aynı listing_id upsert edilir (günceller).
 *   - Görseller her commit'te ilgili ilan için silinip yeniden eklenir.
 */

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { buildImportPlan, type MappedListing } from "../lib/feeds/101evler-import";

const args = process.argv.slice(2);
const source = args.find((a) => !a.startsWith("--"))?.trim();
const commit = args.includes("--commit");
const idPrefix =
  args.find((a) => a.startsWith("--prefix="))?.split("=")[1] ?? "101-";

if (!source) {
  console.error("Hata: XML dosya yolu veya feed URL'si zorunlu.");
  console.error(
    '  npx tsx --env-file=.env scripts/import-101evler.ts "C:\\path\\export.xml"',
  );
  process.exit(1);
}

async function loadXml(src: string): Promise<string> {
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Feed indirilemedi: ${res.status} ${res.statusText}`);
    return await res.text();
  }
  return await readFile(src, "utf8");
}

async function main() {
  const xml = await loadXml(source!);
  const plan = buildImportPlan(xml, idPrefix);

  console.log("─".repeat(60));
  console.log(`Kaynak           : ${source}`);
  console.log(`Toplam <ad>      : ${plan.total}`);
  console.log(`Benzersiz ilan   : ${plan.unique}`);
  console.log(`Tekrarlayan id   : ${plan.duplicates.length}` +
    (plan.duplicates.length ? ` (${[...new Set(plan.duplicates)].join(", ")})` : ""));
  console.log(`listing_id öneki : ${idPrefix}`);
  console.log(`Mod              : ${commit ? "COMMIT (DB'ye yazılacak)" : "DRY-RUN (yazılmaz)"}`);
  console.log("─".repeat(60));

  // Eşleme kalite kontrolü
  const noCity = plan.items.filter((i) => !i.row.city);
  const noPrice = plan.items.filter((i) => !i.row.price);
  const noImages = plan.items.filter((i) => i.images.length === 0);
  console.log(`Şehir eşlenemeyen : ${noCity.length}`);
  console.log(`Fiyatı 0 olan     : ${noPrice.length}`);
  console.log(`Görseli olmayan   : ${noImages.length}`);

  // İlk 3 örnek
  console.log("\nÖrnek (ilk 3):");
  for (const it of plan.items.slice(0, 3)) {
    const r = it.row;
    console.log(
      `  ${it.listing_id} | ${r.kind} | ${r.property_type} | ${r.city}/${r.region} | ` +
        `${r.price} ${r.currency} | ${it.images.length} foto | ${String(r.title).slice(0, 40)}`,
    );
  }

  if (!commit) {
    console.log("\nDRY-RUN bitti. Gerçekten yazmak için sonuna --commit ekleyin.");
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Hata: NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY .env içinde olmalı.",
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let ok = 0;
  let fail = 0;
  const now = new Date().toISOString();

  for (const it of plan.items) {
    const row = { ...it.row, updated_at: now };

    // 1) listings upsert (listing_id benzersiz)
    const { data: up, error: upErr } = await supabase
      .from("listings")
      .upsert(row, { onConflict: "listing_id" })
      .select("id")
      .single();

    if (upErr || !up) {
      fail++;
      console.error(`  ✗ ${it.listing_id}: ${upErr?.message ?? "insert döndü ama satır yok"}`);
      continue;
    }

    const dbId = (up as { id: string }).id;

    // 2) görseller: eskileri sil, yenilerini ekle
    await supabase.from("listing_images").delete().eq("listing_id", dbId);
    if (it.images.length) {
      const imgs = it.images.map((im) => ({
        listing_id: dbId,
        url: im.url,
        sort_order: im.sort_order,
        is_primary: im.is_primary,
      }));
      const { error: imgErr } = await supabase.from("listing_images").insert(imgs);
      if (imgErr) console.error(`    ! ${it.listing_id} görsel hatası: ${imgErr.message}`);
    }

    ok++;
    if (ok % 25 === 0) console.log(`  … ${ok}/${plan.items.length}`);
  }

  console.log("─".repeat(60));
  console.log(`Tamamlandı. Başarılı: ${ok}, Hatalı: ${fail}`);
  console.log("İlanlar DRAFT olarak yazıldı. Panelden gözden geçirip yayınlayın.");
}

main().catch((e: unknown) => {
  console.error("Beklenmeyen hata:", e instanceof Error ? e.message : e);
  process.exit(1);
});
