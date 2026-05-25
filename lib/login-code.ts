import { createHash, randomInt } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PanelRole } from "@/lib/session";

const CODE_TTL_MS = 10 * 60 * 1000;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Yeni kod üretir, eski açık kodları geçersizleştirir, hash'i kaydeder. Ham kodu döndürür. */
export async function issueLoginCode(input: {
  email: string;
  role: PanelRole;
  agentId?: string | null;
}): Promise<string> {
  const code = generateCode();
  const now = Date.now();

  // Aynı e-posta için kullanılmamış eski kodları geçersizleştir.
  await supabaseAdmin
    .from("login_codes")
    .update({ used_at: new Date(now).toISOString() })
    .eq("email", input.email)
    .is("used_at", null);

  const { error } = await supabaseAdmin.from("login_codes").insert({
    agent_id: input.agentId ?? null,
    email: input.email,
    role: input.role,
    code_hash: hashCode(code),
    expires_at: new Date(now + CODE_TTL_MS).toISOString(),
  });

  if (error) {
    throw new Error(`Giriş kodu oluşturulamadı: ${error.message}`);
  }

  return code;
}

/** Kodu doğrular; geçerliyse tek kullanımlık işaretler. */
export async function verifyLoginCodeValue(email: string, code: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("login_codes")
    .select("id, code_hash, expires_at, used_at")
    .eq("email", email)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return false;
  if (data.used_at) return false;
  if (new Date(data.expires_at).getTime() < Date.now()) return false;
  if (data.code_hash !== hashCode(code.trim())) return false;

  await supabaseAdmin
    .from("login_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id);

  return true;
}

export async function recordLoginEvent(input: {
  agentId?: string | null;
  actorName?: string | null;
  role: PanelRole;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await supabaseAdmin.from("login_events").insert({
    agent_id: input.agentId ?? null,
    actor_name: input.actorName ?? null,
    role: input.role,
    email: input.email ?? null,
    ip: input.ip ?? null,
    user_agent: input.userAgent ?? null,
  });
}
