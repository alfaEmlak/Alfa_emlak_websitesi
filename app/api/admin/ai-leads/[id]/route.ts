import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { LeadStatus } from "@/lib/ai/types";

type Props = { params: Promise<{ id: string }> };
const ALLOWED: LeadStatus[] = ["new", "contacted", "in_progress", "closed", "rejected"];

export async function GET(_req: Request, { params }: Props) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { data, error } = await supabaseAdmin.from("ai_customer_forms").select("*").eq("id", id).maybeSingle();
    if (error || !data) return NextResponse.json({ success: false, error: "Lead bulunamadı." }, { status: 404 });
    return NextResponse.json({ success: true, lead: data });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim." }, { status: 401 });
  }
}

export async function PATCH(req: Request, { params }: Props) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = (await req.json()) as { status?: LeadStatus };
    if (!body.status || !ALLOWED.includes(body.status)) {
      return NextResponse.json({ success: false, error: "Geçersiz durum." }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from("ai_customer_forms")
      .update({ status: body.status, updated_at: new Date().toISOString(), is_read: true })
      .eq("id", id);
    if (error) return NextResponse.json({ success: false, error: "Durum güncellenemedi." }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Yetkisiz erişim." }, { status: 401 });
  }
}
