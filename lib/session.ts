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

/** Şifre doğrulandı, e-posta kodu bekleniyor (henüz oturum açılmadı). */
export type PendingLogin = {
  role: PanelRole;
  agentId?: string;
  name?: string;
  email: string;
  mustChangePassword?: boolean;
  expiresAt: number;
};

export type PanelSessionData = {
  isAdmin?: boolean;
  role?: PanelRole;
  agentId?: string;
  name?: string;
  /** Geçici şifreyle giriş yapıldı; panele girmeden önce şifre değişmeli. */
  mustChangePassword?: boolean;
  /** 2FA kod doğrulaması beklenen yarı-oturum. */
  pending?: PendingLogin;
  /** Panel arayüz dili: tr | en | ru | de | fa */
  panelLocale?: string;
};
