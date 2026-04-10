import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSessionData } from "@/lib/session";

export async function getAdminSession() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET ortam değişkeni en az 32 karakter olmalıdır.");
  }
  return getIronSession<AdminSessionData>(await cookies(), sessionOptions);
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return { ok: false as const, session };
  }
  return { ok: true as const, session };
}
