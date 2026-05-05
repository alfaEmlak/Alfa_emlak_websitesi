import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    await requireAdmin();
    const { data, error } = await supabaseAdmin.from("ai_customer_forms").select("*").order("created_at", { ascending: false });
    if (error) return NextResponse.json({ success: false, error: "Lead listesi alınamadı." }, { status: 500 });
    return NextResponse.json({ success: true, leads: data || [] });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim." }, { status: 401 });
  }
}
