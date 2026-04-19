import { getPanelSession, requireAdmin as requirePanelAdmin } from "@/lib/panel-auth";

export async function getAdminSession() {
  return getPanelSession();
}

export async function requireAdmin() {
  const user = await requirePanelAdmin();
  const session = await getPanelSession();

  return {
    ok: true as const,
    session,
    user,
  };
}
