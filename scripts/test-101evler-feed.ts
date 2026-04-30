/**
 * XML feed test üreteci (101evler / Hangiev).
 *
 * Bu script, /api/feeds/<provider>.xml endpoint'leri ile bire bir aynı
 * `buildFeedXml` fonksiyonlarını kullanır. Tek farkı: yalnızca tek bir listing'i
 * (CLI'dan verilen listing_id) Supabase'den çekip XML'i diske yazar. Böylece dev
 * server'ı yeniden başlatmadan, karşı tarafa gidecek XML'i birebir görebiliriz.
 *
 * Kullanım:
 *   npx tsx --env-file=.env scripts/test-101evler-feed.ts AE-2026-96331
 *   npx tsx --env-file=.env scripts/test-101evler-feed.ts AE-2026-96331 --feed=hangiev
 *
 * Çıktı:
 *   scratch/<provider>-<listing_id>.xml
 *   scratch/<provider>-<listing_id>.debug.json
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import {
  buildFeedXml as build101evler,
  type RealtorIds,
} from "../lib/feeds/101evler-builder";
import {
  buildFeedXml as buildHangiev,
  type HangievAccount,
} from "../lib/feeds/hangiev-builder";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");

const args = process.argv.slice(2);
const listingId = args.find((a) => !a.startsWith("--"))?.trim();
const feedFlag = args.find((a) => a.startsWith("--feed="))?.split("=")[1] ?? "101evler";
const feed: "101evler" | "hangiev" =
  feedFlag === "hangiev" ? "hangiev" : "101evler";

if (!listingId) {
  console.error("Hata: listing_id zorunlu. Örnek:");
  console.error("  npx tsx --env-file=.env scripts/test-101evler-feed.ts AE-2026-96331");
  console.error("  npx tsx --env-file=.env scripts/test-101evler-feed.ts AE-2026-96331 --feed=hangiev");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Hata: NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY .env içinde olmalı.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // 1) İlanı çek (listing_images JOIN'li, route.ts ile birebir aynı select)
  const { data: listing, error } = await supabase
    .from("listings")
    .select("*, listing_images(url, sort_order, is_primary)")
    .eq("listing_id", listingId)
    .single();

  if (error || !listing) {
    console.error(`İlan bulunamadı: ${listingId}`);
    if (error) console.error(error.message);
    process.exit(2);
  }

  const settingsCol = feed === "hangiev" ? "ext_hangiev" : "ext_101evler";
  const { data: settingsRow } = await supabase
    .from("site_settings")
    .select(settingsCol)
    .eq("id", 1)
    .single();

  const extRaw = (settingsRow as Record<string, unknown> | null)?.[settingsCol];
  let parsedAccount: Record<string, unknown> = {};
  if (extRaw) {
    if (typeof extRaw === "string") {
      try {
        parsedAccount = JSON.parse(extRaw);
      } catch {
        parsedAccount = {};
      }
    } else if (typeof extRaw === "object") {
      parsedAccount = extRaw as Record<string, unknown>;
    }
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

  let summary;
  let account: RealtorIds | HangievAccount;
  if (feed === "hangiev") {
    account = {
      portal_id: (parsedAccount.portal_id as string | number | null) ?? null,
      agent_id: (parsedAccount.agent_id as string | number | null) ?? null,
      office_id: (parsedAccount.office_id as string | number | null) ?? null,
    };
    summary = buildHangiev([listing], account as HangievAccount, {
      siteUrl,
      defaultLocale: "tr",
    });
  } else {
    account = {
      first_realtor_id:
        (parsedAccount.first_realtor_id as string | number | null) ?? null,
      second_realtor_id:
        (parsedAccount.second_realtor_id as string | number | null) ?? null,
    };
    summary = build101evler([listing], account as RealtorIds, {
      siteUrl,
      defaultLocale: "tr",
    });
  }

  const outDir = resolve(projectRoot, "scratch");
  await mkdir(outDir, { recursive: true });
  const xmlPath = resolve(outDir, `${feed}-${listingId}.xml`);
  const summaryPath = resolve(outDir, `${feed}-${listingId}.debug.json`);

  await writeFile(xmlPath, summary.xml, "utf8");
  await writeFile(
    summaryPath,
    JSON.stringify(
      {
        feed,
        listing_id: listingId,
        total: summary.total,
        included: summary.included,
        skipped: summary.skipped,
        account,
        siteUrl,
        meta: {
          publish_status: listing.publish_status,
          export_to_101evler: listing.export_to_101evler,
          export_to_hangiev: listing.export_to_hangiev,
          ext_101evler: listing.ext_101evler ?? null,
          ext_hangiev: listing.ext_hangiev ?? null,
          currency: listing.currency,
          kind: listing.kind,
          price: listing.price,
          updated_at: listing.updated_at,
          image_count: Array.isArray(listing.listing_images)
            ? listing.listing_images.length
            : 0,
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log("──────────────────────────────────────────────");
  console.log(` ${feed} test feed üretildi`);
  console.log("──────────────────────────────────────────────");
  console.log(` listing_id   : ${listingId}`);
  console.log(` total        : ${summary.total}`);
  console.log(` included     : ${summary.included}`);
  if (summary.skipped.length) {
    console.log(` skipped      :`);
    for (const s of summary.skipped) {
      console.log(`   - ${s.listingId}: ${s.reason}`);
    }
  } else {
    console.log(` skipped      : (yok)`);
  }
  console.log(` XML dosyası  : ${xmlPath}`);
  console.log(` Debug özet   : ${summaryPath}`);
  console.log("──────────────────────────────────────────────");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
