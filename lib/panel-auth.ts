import { cache } from "react";
import { redirect } from "next/navigation";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type PanelSessionData, type PanelRole } from "@/lib/session";

export async function getPanelSession() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET ortam değişkeni en az 32 karakter olmalıdır.");
  }

  return getIronSession<PanelSessionData>(await cookies(), sessionOptions);
}

export const getPanelUser = cache(async () => {
  const session = await getPanelSession();

  if (!session.role) {
    return null;
  }

  return {
    role: session.role,
    isAdmin: session.role === "ADMIN",
    agentId: session.agentId ?? null,
    name: session.name ?? null,
  };
});

export async function requirePanelUser() {
  const user = await getPanelUser();
  if (!user) {
    redirect("/karealfaadmin");
  }
  return user;
}

export async function requireRole(...roles: PanelRole[]) {
  const user = await requirePanelUser();
  if (!roles.includes(user.role)) {
    redirect("/karealfaadmin/dashboard");
  }
  return user;
}

export async function requireAdmin() {
  return requireRole("ADMIN");
}
