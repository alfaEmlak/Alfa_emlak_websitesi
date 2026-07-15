import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildFeedXml, type RealtorIds, type RealtorMap } from "@/lib/feeds/101evler-builder";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Site101Settings = {
  first_realtor_id?: number | string | null;
  second_realtor_id?: number | string | null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const expected = process.env.FEED_101EVLER_TOKEN ?? "";

  if (!expected) {
    return NextResponse.json(
      { error: "FEED_101EVLER_TOKEN is not configured on the server." },
      { status: 500 },
    );
  }
  if (token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Site genel ayarları (realtor IDs)
  const { data: settingsRow } = await supabaseAdmin
    .from("site_settings")
    .select("ext_101evler")
    .eq("id", 1)
    .single();

  let realtors: RealtorIds = {};
  const extRaw = settingsRow?.ext_101evler;
  if (extRaw) {
    let parsed: Site101Settings = extRaw as Site101Settings;
    if (typeof extRaw === "string") {
      try { parsed = JSON.parse(extRaw); } catch { parsed = {}; }
    }
    realtors = {
      first_realtor_id: parsed?.first_realtor_id ?? null,
      second_realtor_id: parsed?.second_realtor_id ?? null,
    };
  }

  // Danışman bazında realtor ID haritası
  const { data: agents } = await supabaseAdmin
    .from("agents")
    .select("email, realtor_id_101")
    .not("realtor_id_101", "is", null);

  const realtorMap: RealtorMap = {};
  for (const a of agents ?? []) {
    if (a.email && a.realtor_id_101 != null) {
      realtorMap[a.email.trim().toLowerCase()] = a.realtor_id_101;
    }
  }

  // PUBLISHED + export_to_101evler=true ilanlar
  const { data: listings, error } = await supabaseAdmin
    .from("listings")
    .select("*, listing_images(url, sort_order, is_primary)")
    .eq("publish_status", "PUBLISHED")
    .eq("export_to_101evler", true)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: `Listings query failed: ${error.message}` },
      { status: 500 },
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    `${url.protocol}//${url.host}`;

  const summary = buildFeedXml(listings ?? [], realtors, {
    siteUrl,
    defaultLocale: "tr",
  }, realtorMap);

  // İsteğe bağlı debug: ?debug=1 → JSON özeti döner (XML yerine)
  if (url.searchParams.get("debug") === "1") {
    return NextResponse.json({
      total: summary.total,
      included: summary.included,
      skipped: summary.skipped,
    });
  }

  return new Response(summary.xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
