import type { SessionOptions } from "iron-session";

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "",
  cookieName: "alfa_admin_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  },
};

export type AdminSessionData = {
  isAdmin?: boolean;
};

export type PanelRole = "ADMIN" | "CONSULTANT";

export type PanelSessionData = {
  isAdmin?: boolean;
  role?: PanelRole;
  agentId?: string;
  name?: string;
};
