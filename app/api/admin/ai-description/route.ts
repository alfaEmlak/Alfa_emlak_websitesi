import { NextResponse } from "next/server";
import OpenAI from "openai";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new OpenAI({
    apiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      mode,
      title,
      kind,
      propertyCategory,
      city,
      region,
      bedrooms,
      bathrooms,
      squareMeters,
      price,
      currency,
      currentShort,
      currentLong,
    } = body as {
      mode: "short" | "long";
      title?: string;
      kind?: string;
      propertyCategory?: string;
      city?: string;
      region?: string;
      bedrooms?: string;
      bathrooms?: string;
      squareMeters?: string;
      price?: string;
      currency?: string;
      currentShort?: string;
      currentLong?: string;
    };

    const context = [
      title && `Başlık: ${title}`,
      kind && `Tür: ${kind === "SALE" ? "Satılık" : "Kiralık"}`,
      propertyCategory && `Kategori: ${propertyCategory}`,
      city && `Şehir: ${city}`,
      region && `Bölge: ${region}`,
      bedrooms && `Yatak odası: ${bedrooms}`,
      bathrooms && `Banyo: ${bathrooms}`,
      squareMeters && `Metrekare: ${squareMeters}`,
      price && currency && `Fiyat: ${price} ${currency}`,
    ]
      .filter(Boolean)
      .join("\n");

    let systemPrompt: string;
    let userPrompt: string;

    if (mode === "short") {
      systemPrompt = `Sen profesyonel bir emlak ilanı yazarısın. Kuzey Kıbrıs'ta (KKTC) faaliyet gösteren Alfa Emlak için kısa ilan açıklamaları yazıyorsun.
Kurallar:
- Türkçe yaz
- 140-160 karakter arası olsun (Google SEO için ideal)
- İlanın en güçlü 2-3 özelliğini öne çıkar
- Doğal ve çekici bir dil kullan, abartma
- Sadece açıklama metnini yaz, başka bir şey ekleme`;
      userPrompt = `Aşağıdaki ilan bilgilerine göre kısa bir açıklama yaz:\n\n${context}${currentShort ? `\n\nMevcut kısa açıklama: ${currentShort}` : ""}`;
    } else {
      systemPrompt = `Sen profesyonel bir emlak ilanı yazarısın. Kuzey Kıbrıs'ta (KKTC) faaliyet gösteren Alfa Emlak için detaylı ilan açıklamaları yazıyorsun.
Kurallar:
- Türkçe yaz
- HTML formatında yaz: <strong> (kalın), <ul>/<li> (madde işareti), <p> (paragraf) kullan
- İlan özelliklerini madde madde listele
- Konumu ve avantajlarını vurgula
- 3-5 paragraf ve bir madde listesi olsun
- Doğal, profesyonel ve çekici bir dil kullan, abartma
- Sadece HTML içeriğini yaz, başka bir şey ekleme`;
      userPrompt = `Aşağıdaki ilan bilgilerine göre detaylı bir açıklama yaz:\n\n${context}${currentLong ? `\n\nMevcut detaylı açıklama: ${currentLong}` : ""}`;
    }

    const client = getClient();
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: mode === "short" ? 200 : 1500,
    });

    const text = response.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ text });
  } catch (e) {
    console.error("AI description error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI hatası" },
      { status: 500 },
    );
  }
}
