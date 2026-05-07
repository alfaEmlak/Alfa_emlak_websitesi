"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PropertyPreferences } from "@/lib/ai/types";
import alfiLogo from "@/alfi_logo.png";

type UiMessage = {
  role: "user" | "assistant";
  content: string;
};

type ListingCard = {
  listingId: string;
  title: string;
  city: string;
  region: string;
  price: number | null;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  areaM2: number | null;
  image: string | null;
  detailUrl: string;
  reason?: string;
};

export function AiSalesAssistant({ locale }: { locale: string }) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const listingsTopRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      role: "assistant",
      content:
        "Merhaba 👋 Ben Alfi, Alfa Emlak yapay zeka emlak asistanınıyım. Ne arıyorsunuz? Örnek: satılık ev, günlük kiralık ev, satılık arsa, kiralık ev.\nYou can also write in other languages.",
    },
  ]);
  const [preferences, setPreferences] = useState<PropertyPreferences>({
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
  });
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadStatus, setLeadStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [leadError, setLeadError] = useState("");
  const [lead, setLead] = useState({
    name: "",
    surname: "",
    phone: "",
    email: "",
    consent: false,
  });
  const [summary, setSummary] = useState("");

  const desiredHomeSummary = useMemo(() => {
    const userLines = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content.trim())
      .filter(Boolean);
    return userLines.slice(-6).join(" | ");
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    if (showLeadForm && listings.length > 0) {
      listingsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, listings, showLeadForm]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          messages: nextMessages,
          preferences,
          sessionId: "site-widget",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Asistan yanıt veremedi.");

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply || "Devam etmek için birkaç detay daha paylaşır mısınız?" }]);
      if (data.preferences && typeof data.preferences === "object") setPreferences(data.preferences);
      if (typeof data.conversationSummary === "string" && data.conversationSummary.trim()) setSummary(data.conversationSummary.trim());
      if (Array.isArray(data.listings)) {
        setListings(data.listings);
      }
      const hasRecommendations = Array.isArray(data.listings) && data.listings.length > 0;
      if (data.shouldShowLeadForm || hasRecommendations) {
        setShowLeadForm(true);
        setLeadSubmitted(false);
      }
      if (data.navigateTo?.detailUrl && typeof data.navigateTo.detailUrl === "string") {
        router.push(data.navigateTo.detailUrl);
        setOpen(false);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Şu anda asistan yanıt oluşturmakta zorlanıyor. Lütfen kısa bir süre sonra tekrar deneyin." }]);
    } finally {
      setLoading(false);
    }
  }

  const phoneClean = lead.phone.replace(/\s+/g, "");
  const phoneValid = /^(?:\+90|0)?5\d{9}$|^\+[1-9]\d{7,14}$/.test(phoneClean);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email);
  const formValid = lead.name.trim().length >= 2 && lead.surname.trim().length >= 2 && phoneValid && emailValid && lead.consent;

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid) return;
    setLeadStatus("sending");
    setLeadError("");
    try {
      const payload = {
        name: lead.name,
        surname: lead.surname,
        phone: lead.phone,
        email: lead.email,
        conversationSummary: summary || desiredHomeSummary,
        propertyPreferences: preferences,
        recommendedListingIds: listings.map((l) => l.listingId),
      };
      const res = await fetch("/api/ai/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Form gönderilemedi.");
      }
      setLeadStatus("success");
      setLead({ name: "", surname: "", phone: "", email: "", consent: false });
      setShowLeadForm(false);
      setLeadSubmitted(true);
    } catch (error) {
      setLeadStatus("error");
      setLeadError(error instanceof Error ? error.message : "Bilgilerinizi kaydederken bir sorun oluştu.");
    }
  }

  return (
    <>
      <div className="fixed bottom-6 right-8 z-50 flex flex-col items-end gap-2">
        {!open ? (
          <div className="pointer-events-none absolute -inset-5 flex items-center justify-center">
            <svg width="180" height="180" viewBox="0 0 180 180" aria-hidden className="overflow-visible rotate-[270deg]">
              <defs>
                <path id="alfi-circle-text" d="M 90,90 m -72,0 a 72,72 0 1,1 144,0 a 72,72 0 1,1 -144,0" />
              </defs>
              <text
                fill="#ffffff"
                stroke="#000000"
                strokeWidth={2}
                strokeLinejoin="round"
                fontSize="10"
                fontWeight="700"
                letterSpacing="1.6"
                style={{
                  filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.6))",
                  paintOrder: "stroke fill",
                }}
              >
                <textPath href="#alfi-circle-text" startOffset="50%" textAnchor="middle">
                  ALFI YAPAY ZEKA ASISTANI
                </textPath>
              </text>
            </svg>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-28 w-28 items-center justify-center rounded-full bg-white p-2 shadow-[0_14px_36px_rgba(0,0,0,0.28)] ring-1 ring-slate-200 transition hover:scale-[1.02] hover:opacity-90"
          aria-label="Alfi yapay zeka asistanını aç"
          title="Alfi ile ev arayın"
        >
          <Image src={alfiLogo} alt="Alfi" width={104} height={104} className="h-24 w-24 object-contain" priority />
        </button>
      </div>

      {open ? (
        <div className="fixed bottom-24 right-6 z-50 h-[min(78vh,620px)] w-[min(95vw,410px)] rounded-2xl bg-white shadow-[0_16px_55px_rgba(0,0,0,0.25)] ring-1 ring-black/10">
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-900">Alfi</p>
              <p className="text-xs text-emerald-600">● Çevrimiçi</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-slate-500">Kapat</button>
          </div>

          <div ref={scrollRef} className="h-[calc(100%-126px)] space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m, idx) => (
              <div key={idx} className={`rounded-xl px-3 py-2 text-sm ${m.role === "user" ? "ml-10 bg-slate-900 text-white" : "mr-10 bg-slate-100 text-slate-800"}`}>
                {m.content}
              </div>
            ))}

            {listings.length > 0 ? (
              <div ref={listingsTopRef} className="space-y-2 pt-1">
                {listings.slice(0, 3).map((item) => (
                  <div key={item.listingId} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs text-slate-500">{item.listingId}</p>
                    <p className="line-clamp-2 text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {[item.city, item.region].filter(Boolean).join(" / ")}
                      {item.bedrooms != null ? ` · ${item.bedrooms} oda` : ""}
                      {item.areaM2 ? ` · ${item.areaM2} m²` : ""}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        router.push(item.detailUrl);
                        setOpen(false);
                      }}
                      className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      İlanı Aç
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {showLeadForm ? (
              <form onSubmit={submitLead} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-700">
                  Size daha iyi yardımcı olabilmemiz ve danışmanlarımızın sizinle iletişime geçebilmesi için kısa bir iletişim formu paylaşacağım.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    required
                    minLength={2}
                    value={lead.name}
                    onChange={(e) => setLead((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    placeholder="Ad"
                  />
                  <input
                    required
                    minLength={2}
                    value={lead.surname}
                    onChange={(e) => setLead((p) => ({ ...p, surname: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    placeholder="Soyad"
                  />
                </div>
                <input
                  required
                  value={lead.phone}
                  onChange={(e) => setLead((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="Telefon"
                />
                <input
                  required
                  type="email"
                  value={lead.email}
                  onChange={(e) => setLead((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="E-posta"
                />
                <label className="flex items-start gap-2 text-[11px] text-slate-600">
                  <input
                    type="checkbox"
                    checked={lead.consent}
                    onChange={(e) => setLead((p) => ({ ...p, consent: e.target.checked }))}
                    className="mt-0.5"
                  />
                  Bilgileriniz, sizinle iletişime geçilmesi ve talebinize uygun ilanların paylaşılması amacıyla kullanılacaktır.
                </label>
                {!formValid && leadStatus !== "success" ? (
                  <p className="text-[11px] text-amber-700">Formu göndermek için tüm alanları doğru doldurun.</p>
                ) : null}
                {leadStatus === "error" ? <p className="text-xs text-red-600">{leadError}</p> : null}
                {leadStatus === "success" ? <p className="text-xs text-emerald-700">Bilgileriniz alındı.</p> : null}
                <button
                  type="submit"
                  disabled={leadStatus === "sending" || !formValid}
                  className="w-full rounded-lg bg-(--secondary) px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {leadStatus === "sending" ? "Gönderiliyor..." : "Bilgilerimi Gönder"}
                </button>
              </form>
            ) : null}
            {loading ? (
              <div className="mr-10 inline-flex rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500">
                Yazıyor...
              </div>
            ) : null}
            {leadSubmitted ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                Bilgileriniz başarıyla alındı. Talebiniz danışman ekibimize iletildi. Sizin için en uygun ilanlarla ilgili en kısa sürede iletişime geçilecek. Başka sorunuz var mı?
              </div>
            ) : null}
          </div>

          <div className="flex gap-2 border-t border-black/10 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Nasıl bir ev arıyorsunuz?"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={loading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "..." : "Gönder"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
