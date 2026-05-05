import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getListingForAssistant, searchListingsForAssistant } from "@/lib/ai/listings";
import type { ListingForAssistant, PropertyPreferences } from "@/lib/ai/types";

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are a professional AI real estate sales consultant.
Speak Turkish by default, but if the user writes in another language, continue in that language.
Be concise, warm, and professional.
Ask one or two questions at a time and guide the customer naturally.
Never invent listings. Recommend only listings returned by tools.
When enough information exists, call searchListings.
If user asks detail, call getListingDetails.
If user asks to open a listing, call navigateToListing.
When user shows serious interest or after recommendations, call showLeadForm.
Keep/update a structured property preference object with:
intent(buy/rent), city, district, neighborhood, propertyType, budgetMin, budgetMax, currency, rooms, minSquareMeters, furnished, features, notes.
Always classify results as exact matches or close alternatives.`;

const DEFAULT_PREFERENCES: PropertyPreferences = {
  intent: null,
  location: { city: null, district: null, neighborhood: null },
  propertyType: null,
  budgetMin: null,
  budgetMax: null,
  currency: null,
  rooms: null,
  minSquareMeters: null,
  furnished: null,
  features: [],
  notes: "",
};

function norm(v: string) {
  return v
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ı]/g, "i")
    .trim();
}

function parseNumber(text: string) {
  const m = text.replace(/\./g, "").match(/(\d{2,9})/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function extractPrefsFromMessages(messages: ChatMessage[], current: PropertyPreferences): PropertyPreferences {
  const p = { ...current, location: { ...current.location }, features: [...current.features] };
  const userText = messages.filter((m) => m.role === "user").map((m) => m.content).join(" | ");
  const t = norm(userText);

  if (t.includes("satilik") || t.includes("satin almak") || t.includes("satın almak")) p.intent = "buy";
  if (t.includes("kiralik") || t.includes("kiralamak")) p.intent = "rent";

  if (t.includes("arsa") || t.includes("arazi")) p.propertyType = "arsa";
  else if (t.includes("villa")) p.propertyType = "villa";
  else if (t.includes("daire") || t.includes("ev")) p.propertyType = "konut";

  if (t.includes("girne")) p.location.city = "Girne";
  if (
    t.includes("lefkosa") ||
    t.includes("lefkoşa") ||
    t.includes("kuzey lefkos") ||
    (t.includes("kuzey") && t.includes("lefko")) ||
    t.includes("north nicosia") ||
    t.includes("nicosia")
  ) {
    p.location.city = "Lefkoşa";
  }
  if (t.includes("agirdag") || t.includes("ağırdağ")) p.location.neighborhood = "Ağırdağ";
  if (t.includes("kaymakli") || t.includes("kaymaklı")) p.location.neighborhood = "Kaymaklı";

  if (t.includes("sterlin") || t.includes("gbp") || t.includes("£")) p.currency = "GBP";
  if (t.includes("tl") || t.includes("try") || t.includes("₺")) p.currency = "TRY";
  if (t.includes("euro") || t.includes("eur") || t.includes("€")) p.currency = "EUR";

  const budgetMatch = t.match(/(\d[\d\.]{2,8})\s*(sterlin|gbp|tl|try|euro|eur|₺|£|€)?\s*(butce|bütce|bütçe)?/);
  if (budgetMatch) {
    const val = parseNumber(budgetMatch[1]);
    if (val) p.budgetMax = val;
  }

  const m2Match = t.match(/(?:min(?:imum)?\s*)?(\d[\d\.]{2,7})\s*(m2|metrekare|m²)/);
  if (m2Match) {
    const m2 = parseNumber(m2Match[1]);
    if (m2) p.minSquareMeters = m2;
  }

  return p;
}

function buildRuleBasedReply(preferences: PropertyPreferences, listingsCount: number) {
  if (!preferences.intent) {
    return "Ne arıyorsunuz? Örnek: satılık ev, günlük kiralık ev, satılık arsa, kiralık ev.";
  }
  if (!preferences.location.city && !preferences.location.neighborhood) {
    return "Hangi şehir/bölgede aradığınızı da yazar mısınız?";
  }
  if (!preferences.budgetMax) return "Bütçe aralığınızı da paylaşırsanız sizin için uygun ilanları hemen tarayabilirim.";
  if (listingsCount === 0) {
    return "Verdiğiniz kriterlere birebir uyan ilan bulamadım. İsterseniz bütçe veya lokasyonu biraz genişleterek yakın alternatiflere bakalım.";
  }
  return `Kriterlerinize uygun ${listingsCount} ilan buldum. İsterseniz içlerinden birini hemen açabilirim.`;
}

function hasEnoughSearchCriteria(preferences: PropertyPreferences) {
  const hasIntent = preferences.intent === "buy" || preferences.intent === "rent";
  const hasLocation = Boolean(preferences.location.city || preferences.location.district || preferences.location.neighborhood);
  const hasBudget = typeof preferences.budgetMax === "number" && preferences.budgetMax > 0;
  return hasIntent && hasLocation && hasBudget;
}

function mergePreferences(base: PropertyPreferences, incoming: unknown): PropertyPreferences {
  const src = (incoming && typeof incoming === "object" ? incoming : {}) as Record<string, unknown>;
  const locationSrc = (src.location && typeof src.location === "object" ? src.location : {}) as Record<string, unknown>;
  return {
    ...base,
    intent: src.intent === "buy" || src.intent === "rent" ? src.intent : base.intent,
    location: {
      city: typeof locationSrc.city === "string" ? locationSrc.city : base.location.city,
      district: typeof locationSrc.district === "string" ? locationSrc.district : base.location.district,
      neighborhood: typeof locationSrc.neighborhood === "string" ? locationSrc.neighborhood : base.location.neighborhood,
    },
    propertyType: typeof src.propertyType === "string" ? src.propertyType : base.propertyType,
    budgetMin: typeof src.budgetMin === "number" ? src.budgetMin : base.budgetMin,
    budgetMax: typeof src.budgetMax === "number" ? src.budgetMax : base.budgetMax,
    currency: typeof src.currency === "string" ? src.currency : base.currency,
    rooms: typeof src.rooms === "string" ? src.rooms : base.rooms,
    minSquareMeters: typeof src.minSquareMeters === "number" ? src.minSquareMeters : base.minSquareMeters,
    furnished: typeof src.furnished === "boolean" ? src.furnished : base.furnished,
    features: Array.isArray(src.features) ? src.features.filter((x): x is string => typeof x === "string") : base.features,
    notes: typeof src.notes === "string" ? src.notes : base.notes,
  };
}

export async function POST(req: Request) {
  let fallbackMessages: ChatMessage[] = [];
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "AI servisi yapılandırılmamış." }, { status: 500 });
    }

    const body = (await req.json()) as {
      locale?: string;
      messages?: ChatMessage[];
      preferences?: PropertyPreferences;
      sessionId?: string;
    };
    const locale = body.locale || "tr";
    const messages = (body.messages || []).filter(
      (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim(),
    );
    fallbackMessages = messages;
    if (messages.length === 0) {
      return NextResponse.json({ error: "Mesaj bulunamadı." }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });

    const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    let preferences = body.preferences || DEFAULT_PREFERENCES;
    let shouldShowLeadForm = false;
    let navigateTo: { listingId: string; detailUrl: string } | null = null;
    let summary = "";
    let recommended: ListingForAssistant[] = [];

    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: "function",
        function: {
          name: "searchListings",
          description: "Search listings from database using criteria. Returns real listings only.",
          parameters: {
            type: "object",
            properties: {
              intent: { type: "string", enum: ["buy", "rent"] },
              city: { type: "string" },
              district: { type: "string" },
              neighborhood: { type: "string" },
              propertyType: { type: "string" },
              budgetMin: { type: "number" },
              budgetMax: { type: "number" },
              currency: { type: "string" },
              rooms: { type: "string" },
              minSquareMeters: { type: "number" },
              features: { type: "array", items: { type: "string" } },
              query: { type: "string" },
              limit: { type: "number" },
            },
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getListingDetails",
          description: "Get detail of one listing by listingId.",
          parameters: {
            type: "object",
            properties: { listingId: { type: "string" } },
            required: ["listingId"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "navigateToListing",
          description: "Prepare navigation to listing detail page.",
          parameters: {
            type: "object",
            properties: { listingId: { type: "string" }, detailUrl: { type: "string" } },
            required: ["listingId"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "showLeadForm",
          description: "Show lead form in chat UI.",
          parameters: { type: "object", properties: { reason: { type: "string" } }, additionalProperties: false },
        },
      },
      {
        type: "function",
        function: {
          name: "saveConversationSummary",
          description: "Update session summary and preference object.",
          parameters: {
            type: "object",
            properties: {
              conversationSummary: { type: "string" },
              propertyPreferences: { type: "object" },
              recommendedListingIds: { type: "array", items: { type: "string" } },
            },
            additionalProperties: false,
          },
        },
      },
    ];

    let completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.25,
      messages: chatMessages,
      tools,
      tool_choice: "auto",
    });

    for (let i = 0; i < 4; i += 1) {
      const assistantMessage = completion.choices[0]?.message;
      const toolCalls = assistantMessage?.tool_calls;
      if (!toolCalls?.length) break;

      chatMessages.push(assistantMessage);

      for (const toolCall of toolCalls) {
        if (toolCall.type !== "function") continue;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(toolCall.function.arguments || "{}");
        } catch {
          args = {};
        }
        const name = toolCall.function.name;

        if (name === "searchListings") {
          const effectivePrefs = {
            intent: args.intent === "buy" || args.intent === "rent" ? args.intent : preferences.intent,
            location: {
              city: typeof args.city === "string" ? args.city : preferences.location.city,
              district: typeof args.district === "string" ? args.district : preferences.location.district,
              neighborhood: typeof args.neighborhood === "string" ? args.neighborhood : preferences.location.neighborhood,
            },
            propertyType: typeof args.propertyType === "string" ? args.propertyType : preferences.propertyType,
            budgetMin: typeof args.budgetMin === "number" ? args.budgetMin : preferences.budgetMin,
            budgetMax: typeof args.budgetMax === "number" ? args.budgetMax : preferences.budgetMax,
            currency: typeof args.currency === "string" ? args.currency : preferences.currency,
            rooms: typeof args.rooms === "string" ? args.rooms : preferences.rooms,
            minSquareMeters: typeof args.minSquareMeters === "number" ? args.minSquareMeters : preferences.minSquareMeters,
            features: Array.isArray(args.features)
              ? args.features.filter((x): x is string => typeof x === "string")
              : preferences.features,
            furnished: preferences.furnished,
            notes: preferences.notes,
          } satisfies PropertyPreferences;

          if (!hasEnoughSearchCriteria(effectivePrefs)) {
            chatMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                success: false,
                needsMoreInfo: true,
                message: "Arama için satılık/kiralık, lokasyon ve bütçe bilgisi gerekli.",
              }),
            });
            continue;
          }

          const listings = await searchListingsForAssistant(
            {
              intent: effectivePrefs.intent,
              city: effectivePrefs.location.city,
              district: effectivePrefs.location.district,
              neighborhood: effectivePrefs.location.neighborhood,
              propertyType: effectivePrefs.propertyType,
              budgetMin: effectivePrefs.budgetMin,
              budgetMax: effectivePrefs.budgetMax,
              currency: effectivePrefs.currency,
              rooms: effectivePrefs.rooms,
              minSquareMeters: effectivePrefs.minSquareMeters,
              features: effectivePrefs.features,
              query: typeof args.query === "string" ? args.query : undefined,
              limit: typeof args.limit === "number" ? args.limit : 5,
            },
            locale,
          );
          recommended = listings.slice(0, 5);
          chatMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ success: true, listings }) });
          continue;
        }

        if (name === "getListingDetails") {
          const listingId = typeof args.listingId === "string" ? args.listingId : "";
          const listing = listingId ? await getListingForAssistant(listingId, locale) : null;
          chatMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(listing ? { success: true, listing } : { success: false, error: "İlan bulunamadı." }),
          });
          continue;
        }

        if (name === "navigateToListing") {
          const listingId = typeof args.listingId === "string" ? args.listingId : "";
          const detailUrl = typeof args.detailUrl === "string" ? args.detailUrl : `/${locale}/ilan/${listingId}`;
          if (listingId) navigateTo = { listingId, detailUrl };
          chatMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ success: true, listingId, detailUrl }) });
          continue;
        }

        if (name === "showLeadForm") {
          shouldShowLeadForm = true;
          chatMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ success: true }) });
          continue;
        }

        if (name === "saveConversationSummary") {
          if (typeof args.conversationSummary === "string") summary = args.conversationSummary;
          preferences = mergePreferences(preferences, args.propertyPreferences);
          chatMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ success: true, sessionId: body.sessionId || null }) });
          continue;
        }

        chatMessages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify({ success: false }) });
      }

      completion = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.25,
        messages: chatMessages,
        tools,
      });
    }

    const reply =
      completion.choices[0]?.message?.content ||
      "Şu anda asistan yanıt oluşturmakta zorlanıyor. Lütfen kısa bir süre sonra tekrar deneyin.";

    return NextResponse.json({
      success: true,
      reply,
      shouldShowLeadForm,
      navigateTo,
      listings: recommended.slice(0, 3),
      conversationSummary: summary,
      preferences,
      recommendedListingIds: recommended.map((x) => x.listingId),
    });
  } catch (error) {
    console.error("[ai/chat]", error);
    const pref = extractPrefsFromMessages(fallbackMessages, DEFAULT_PREFERENCES);
    const listings = hasEnoughSearchCriteria(pref)
      ? await searchListingsForAssistant(
          {
            intent: pref.intent,
            city: pref.location.city,
            neighborhood: pref.location.neighborhood,
            district: pref.location.district,
            propertyType: pref.propertyType,
            budgetMax: pref.budgetMax,
            budgetMin: pref.budgetMin,
            currency: pref.currency,
            minSquareMeters: pref.minSquareMeters,
            rooms: pref.rooms,
            features: pref.features,
            limit: 3,
          },
          "tr",
        ).catch(() => [])
      : [];
    const fallbackReply = buildRuleBasedReply(pref, listings.length);
    return NextResponse.json(
      {
        success: true,
        reply: fallbackReply,
        shouldShowLeadForm: listings.length > 0,
        listings,
        preferences: pref,
        recommendedListingIds: listings.map((x) => x.listingId),
        conversationSummary: "",
      },
      { status: 200 },
    );
  }
}
