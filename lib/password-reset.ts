import { createHash, randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 saat

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Verilen e-postaya ait aktif danışman varsa sıfırlama token'ı üretir ve ham token'ı döndürür.
 * Hesap yoksa null döner (çağıran taraf yine "gönderildi" mesajı gösterir — enumeration önleme).
 */
export async function issuePasswordResetToken(email: string): Promise<
  | { token: string; agentId: string; name: string; email: string }
  | null
> {
  const { data: agent } = await supabaseAdmin
    .from("agents")
    .select("id, name, email, is_active")
    .eq("email", email)
    .maybeSingle();

  if (!agent || !agent.is_active) return null;

  const token = randomBytes(32).toString("hex");
  const now = Date.now();

  // Aynı hesabın kullanılmamış eski token'larını geçersizleştir.
  await supabaseAdmin
    .from("password_reset_tokens")
    .update({ used_at: new Date(now).toISOString() })
    .eq("agent_id", agent.id)
    .is("used_at", null);

  const { error } = await supabaseAdmin.from("password_reset_tokens").insert({
    agent_id: agent.id,
    email,
    token_hash: hashToken(token),
    expires_at: new Date(now + TOKEN_TTL_MS).toISOString(),
  });

  if (error) {
    throw new Error(`Sıfırlama token'ı oluşturulamadı: ${error.message}`);
  }

  return { token, agentId: String(agent.id), name: String(agent.name ?? ""), email };
}

/** Token'ı doğrular; geçerliyse agentId döndürür ve tek kullanımlık işaretler. */
export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("password_reset_tokens")
    .select("id, agent_id, expires_at, used_at")
    .eq("token_hash", hashToken(token.trim()))
    .maybeSingle();

  if (error || !data) return null;
  if (data.used_at) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;

  await supabaseAdmin
    .from("password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id);

  return data.agent_id ? String(data.agent_id) : null;
}

/** Token'ı tüketmeden geçerli mi diye bakar (sayfa açılışında form göstermek için). */
export async function isResetTokenValid(token: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("password_reset_tokens")
    .select("expires_at, used_at")
    .eq("token_hash", hashToken(token.trim()))
    .maybeSingle();
  if (!data || data.used_at) return false;
  return new Date(data.expires_at).getTime() >= Date.now();
}
