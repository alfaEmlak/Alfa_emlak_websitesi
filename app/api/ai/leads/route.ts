import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AI_LEAD_TRANSCRIPT_MARKER } from "@/lib/ai-forms-checkpoint";
import type { PropertyPreferences } from "@/lib/ai/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(?:\+90|0)?5\d{9}$|^\+[1-9]\d{7,14}$/;

type TranscriptLine = { role: string; content: string };

type LeadPayload = {
  name?: string;
  surname?: string;
  phone?: string;
  email?: string;
  conversationSummary?: string;
  propertyPreferences?: PropertyPreferences;
  recommendedListingIds?: string[];
  /** Kullanıcı + asistan mesajları (kısaltılmış dizi) */
  conversationTranscript?: TranscriptLine[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LeadPayload;

    const name = (body.name || "").trim();
    const surname = (body.surname || "").trim();
    const phone = (body.phone || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const conversationSummary = (body.conversationSummary || "").trim();
    const propertyPreferences = body.propertyPreferences || null;
    const recommendedListingIds = Array.isArray(body.recommendedListingIds)
      ? body.recommendedListingIds.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];

    const transcriptLines: TranscriptLine[] = Array.isArray(body.conversationTranscript)
      ? body.conversationTranscript
          .filter(
            (x): x is TranscriptLine =>
              !!x && typeof x === "object" && typeof x.role === "string" && typeof x.content === "string",
          )
          .slice(-120)
      : [];
    const chatTranscriptJson = transcriptLines.length > 0 ? JSON.stringify(transcriptLines) : null;

    if (name.length < 2) return NextResponse.json({ success: false, error: "Ad alanı zorunludur." }, { status: 400 });
    if (surname.length < 2) return NextResponse.json({ success: false, error: "Soyad alanı zorunludur." }, { status: 400 });
    if (!PHONE_RE.test(phone.replace(/\s+/g, ""))) {
      return NextResponse.json({ success: false, error: "Geçerli bir telefon numarası giriniz." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) return NextResponse.json({ success: false, error: "Geçerli bir e-posta giriniz." }, { status: 400 });

    const fullName = `${name} ${surname}`.trim();
    const summaryText =
      conversationSummary ||
      `AI talep özeti: ${JSON.stringify(
        {
          intent: propertyPreferences?.intent ?? null,
          location: propertyPreferences?.location ?? null,
          propertyType: propertyPreferences?.propertyType ?? null,
          budgetMin: propertyPreferences?.budgetMin ?? null,
          budgetMax: propertyPreferences?.budgetMax ?? null,
          currency: propertyPreferences?.currency ?? null,
          rooms: propertyPreferences?.rooms ?? null,
          minSquareMeters: propertyPreferences?.minSquareMeters ?? null,
          features: propertyPreferences?.features ?? [],
          notes: propertyPreferences?.notes ?? "",
          recommendedListingIds,
        },
        null,
        2,
      )}`;

    const contactMessageBody =
      chatTranscriptJson != null
        ? `${summaryText || ""}${AI_LEAD_TRANSCRIPT_MARKER}${chatTranscriptJson}`
        : summaryText || "(Özet yok)";

    function revalidateAdminAiForms() {
      try {
        revalidatePath("/karealfaadmin");
      } catch {
        /* build ortamında cache yoksa sorun değil */
      }
    }

    const { data, error } = await supabaseAdmin
      .from("ai_customer_forms")
      .insert({
        full_name: fullName,
        first_name: name,
        last_name: surname,
        phone,
        email,
        desired_home_summary: summaryText || null,
        property_preferences: propertyPreferences,
        conversation_summary: summaryText || null,
        chat_transcript: chatTranscriptJson,
        matched_listing_ids: recommendedListingIds,
        recommended_listing_ids: recommendedListingIds,
        status: "new",
        source: "ai_assistant",
      })
      .select("id")
      .single();

    if (error) {
      // Backward-compatible fallback for databases where new columns are not migrated yet.
      const fallback = await supabaseAdmin
        .from("ai_customer_forms")
        .insert({
          full_name: fullName,
          phone,
          email,
          desired_home_summary: summaryText || null,
          chat_transcript: chatTranscriptJson,
          matched_listing_ids: recommendedListingIds,
          source: "ai_assistant",
        })
        .select("id")
        .single();

      if (fallback.error) {
        // Final guaranteed fallback: store into existing contact_messages table.
        const { data: contactData, error: contactError } = await supabaseAdmin
          .from("contact_messages")
          .insert({
            name: fullName,
            email,
            phone,
            subject: "AI_LEAD",
            message: contactMessageBody,
            listing_id: recommendedListingIds.length > 0 ? recommendedListingIds.join(",") : null,
          })
          .select("id")
          .single();

        if (contactError) {
          return NextResponse.json({ success: false, error: "Bilgiler kaydedilirken bir sorun oluştu." }, { status: 500 });
        }

        revalidateAdminAiForms();
        return NextResponse.json({
          success: true,
          leadId: contactData?.id || null,
          message: "Bilgileriniz başarıyla alındı. Talebiniz danışman ekibimize iletildi.",
        });
      }

      revalidateAdminAiForms();
      return NextResponse.json({
        success: true,
        leadId: fallback.data?.id || null,
        message: "Bilgileriniz başarıyla alındı. Talebiniz danışman ekibimize iletildi.",
      });
    }

    revalidateAdminAiForms();
    return NextResponse.json({
      success: true,
      leadId: data?.id || null,
      message: "Bilgileriniz başarıyla alındı. Talebiniz danışman ekibimize iletildi.",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Bilgilerinizi kaydederken bir sorun oluştu. Lütfen tekrar deneyin." },
      { status: 500 },
    );
  }
}
