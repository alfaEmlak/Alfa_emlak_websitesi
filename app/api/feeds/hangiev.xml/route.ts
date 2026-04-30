import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildFeedXml, type HangievAccount } from "@/lib/feeds/hangiev-builder";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SiteHangievSettings = {
  portal_id?: number | string | null;
  agent_id?: number | string | null;
  office_id?: number | string | null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const expected = process.env.FEED_HANGIEV_TOKEN ?? "";

  if (!expected) {
    return NextResponse.json(
      { error: "FEED_HANGIEV_TOKEN is not configured on the server." },
      { status: 500 },
    );
  }
  if (token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: settingsRow } = await supabaseAdmin
    .from("site_settings")
    .select("ext_hangiev")
    .eq("id", 1)
    .single();

  let account: HangievAccount = {};
  const extRaw = settingsRow?.ext_hangiev;
  if (extRaw) {
    let parsed: SiteHangievSettings = extRaw as SiteHangievSettings;
    if (typeof extRaw === "string") {
      try { parsed = JSON.parse(extRaw); } catch { parsed = {}; }
    }
    account = {
      portal_id: parsed?.portal_id ?? null,
      agent_id: parsed?.agent_id ?? null,
      office_id: parsed?.office_id ?? null,
    };
  }

  const { data: listings, error } = await supabaseAdmin
    .from("listings")
    .select("*, listing_images(url, sort_order, is_primary)")
    .eq("publish_status", "PUBLISHED")
    .eq("export_to_hangiev", true)
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

  const summary = buildFeedXml(listings ?? [], account, {
    siteUrl,
    defaultLocale: "tr",
  });

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
