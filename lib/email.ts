import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

type SendResult = { ok: true } | { ok: false; error: string };

async function send(to: string, subject: string, html: string): Promise<SendResult> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY tanımlı değil." };
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

function shell(title: string, body: string): string {
  return `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f1f4b">
    <h2 style="margin:0 0 4px;color:#0a1f5c">ALFA EMLAK</h2>
    <p style="margin:0 0 20px;color:#64748b;font-size:13px">${title}</p>
    ${body}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
    <p style="color:#94a3b8;font-size:12px;margin:0">Bu e-postayı siz talep etmediyseniz dikkate almayın.</p>
  </div>`;
}

export async function sendLoginCodeEmail(to: string, name: string, code: string): Promise<SendResult> {
  const body = `
    <p style="font-size:14px">Merhaba ${name || ""},</p>
    <p style="font-size:14px">Panel giriş doğrulama kodunuz:</p>
    <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0a1f5c;text-align:center;background:#f1f5f9;border-radius:12px;padding:16px 0;margin:16px 0">${code}</p>
    <p style="font-size:13px;color:#64748b">Kod 10 dakika geçerlidir. Tek seferlik kullanılır.</p>`;
  return send(to, `Alfa Emlak giriş kodu: ${code}`, shell("Giriş doğrulama kodu", body));
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string,
): Promise<SendResult> {
  const body = `
    <p style="font-size:14px">Merhaba ${name || ""},</p>
    <p style="font-size:14px">Şifre sıfırlama talebinde bulundunuz. Yeni şifre belirlemek için aşağıdaki butona tıklayın:</p>
    <p style="margin:20px 0"><a href="${resetUrl}" style="background:#f97316;color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px;display:inline-block">Şifremi sıfırla</a></p>
    <p style="font-size:13px;color:#64748b">Bağlantı 1 saat geçerlidir ve tek seferlik kullanılır. Bu talebi siz yapmadıysanız bu e-postayı yok sayın; şifreniz değişmez.</p>
    <p style="font-size:12px;color:#94a3b8;word-break:break-all">Buton çalışmazsa: ${resetUrl}</p>`;
  return send(to, "Alfa Emlak şifre sıfırlama", shell("Şifre sıfırlama", body));
}

export async function sendTempPasswordEmail(
  to: string,
  name: string,
  tempPassword: string,
  loginUrl: string,
): Promise<SendResult> {
  const body = `
    <p style="font-size:14px">Merhaba ${name || ""},</p>
    <p style="font-size:14px">Alfa Emlak danışman paneli için hesabınız oluşturuldu. Geçici şifreniz:</p>
    <p style="font-size:22px;font-weight:bold;letter-spacing:2px;color:#0a1f5c;text-align:center;background:#f1f5f9;border-radius:12px;padding:14px 0;margin:16px 0">${tempPassword}</p>
    <p style="font-size:13px;color:#64748b">İlk girişte yeni bir şifre belirlemeniz istenecektir. Girişte e-posta adresinize doğrulama kodu gönderilir.</p>
    <p style="margin:20px 0"><a href="${loginUrl}" style="background:#f97316;color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px;display:inline-block">Panele giriş yap</a></p>`;
  return send(to, "Alfa Emlak panel erişiminiz", shell("Hesap erişimi", body));
}
