import { supabaseAdmin } from "@/lib/supabase/admin";

export type StoredChatLine = { role: string; content: string };

/** `contact_messages` AI_LEAD kaydında özet + transcript birlikte saklanır. */
export const AI_LEAD_TRANSCRIPT_MARKER = "\n\n__AI_CHAT_TRANSCRIPT_JSON__\n";

/** `chat_transcript` sütununda saklanan JSON dizisini okur. */
export function parseStoredChatTranscript(raw: string | null | undefined): StoredChatLine[] | null {
  if (!raw?.trim()) return null;
  try {
    const j = JSON.parse(raw) as unknown;
    if (!Array.isArray(j)) return null;
    const out: StoredChatLine[] = [];
    for (const item of j) {
      if (
        item &&
        typeof item === "object" &&
        "role" in item &&
        "content" in item &&
        typeof (item as StoredChatLine).role === "string" &&
        typeof (item as StoredChatLine).content === "string"
      ) {
        out.push({ role: (item as StoredChatLine).role, content: (item as StoredChatLine).content });
      }
    }
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

/** `contact_messages.message` içinde gömülü transcript varsa ayırır (AI_LEAD yedek kaydı). */
export function splitContactAiLeadMessage(raw: string | null | undefined): {
  summary: string;
  transcript: StoredChatLine[] | null;
} {
  const s = raw ?? "";
  const idx = s.indexOf(AI_LEAD_TRANSCRIPT_MARKER);
  if (idx === -1) {
    return { summary: s.trim(), transcript: null };
  }
  const summary = s.slice(0, idx).trim();
  const jsonPart = s.slice(idx + AI_LEAD_TRANSCRIPT_MARKER.length).trim();
  const transcript = parseStoredChatTranscript(jsonPart);
  return { summary, transcript };
}

/** Admin bu çerezi son ziyaret çıkışında günceller; bundan sonra gelen formlar “yeni” sayılır. */
export const AI_FORMS_CHECKPOINT_COOKIE = "alfa_ai_forms_checkpoint";

export function checkpointThresholdMs(checkpointIso: string | undefined): number {
  if (!checkpointIso?.trim()) return 0;
  const ms = Date.parse(checkpointIso);
  return Number.isNaN(ms) ? 0 : ms;
}

export function isAiFormRowNew(createdAt: string, checkpointIso: string | undefined): boolean {
  const t = new Date(createdAt).getTime();
  return t > checkpointThresholdMs(checkpointIso);
}

/** checkpoint yoksa eşik 0 → birikmiş tüm kayıtlar “yeni” kabul edilir (ilk tur). */
export async function countAiFormsNewerThanCheckpoint(checkpointIso: string | undefined): Promise<number> {
  const threshold = checkpointThresholdMs(checkpointIso);
  const iso = new Date(threshold).toISOString();

  const [{ count: nAi }, { count: nContact }] = await Promise.all([
    supabaseAdmin.from("ai_customer_forms").select("*", { count: "exact", head: true }).gt("created_at", iso),
    supabaseAdmin
      .from("contact_messages")
      .select("*", { count: "exact", head: true })
      .eq("subject", "AI_LEAD")
      .gt("created_at", iso),
  ]);

  return (nAi ?? 0) + (nContact ?? 0);
}
