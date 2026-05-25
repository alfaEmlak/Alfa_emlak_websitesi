import { redirect } from "next/navigation";
import { getPanelSession } from "@/lib/panel-auth";
import { verifyLoginCode, resendLoginCode } from "@/app/karealfaadmin/actions";

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const shown = user.slice(0, 2);
  return `${shown}${"*".repeat(Math.max(1, user.length - 2))}@${domain}`;
}

export default async function VerifyCodePage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; sent?: string }>;
}) {
  const session = await getPanelSession();
  const pending = session.pending;
  if (!pending || pending.expiresAt < Date.now()) {
    redirect("/karealfaadmin?e=expired");
  }
  const sp = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-(--primary) via-[#0a1f5c] to-[#020818]" aria-hidden />
      <div className="admin-card relative w-full max-w-md p-8 sm:p-10">
        <p className="label-sm text-center text-(--secondary)">ALFA EMLAK</p>
        <h1 className="admin-page-title mt-2 text-center text-2xl font-bold">Giriş doğrulama</h1>
        <p className="mt-1 text-center text-sm text-(--on-surface)/55">
          <span className="font-semibold">{maskEmail(pending.email)}</span> adresine 6 haneli kod gönderdik.
        </p>

        {sp.e === "1" ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-center text-sm text-red-800 ring-1 ring-red-100">
            Kod hatalı veya süresi dolmuş. Tekrar deneyin.
          </p>
        ) : null}
        {sp.e === "mail" ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-center text-sm text-red-800 ring-1 ring-red-100">
            Kod e-postası gönderilemedi.
          </p>
        ) : null}
        {sp.sent === "1" ? (
          <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2.5 text-center text-sm text-emerald-800 ring-1 ring-emerald-100">
            Yeni kod gönderildi.
          </p>
        ) : null}

        <form action={verifyLoginCode} className="mt-8 space-y-4">
          <div>
            <label htmlFor="code" className="block text-xs font-semibold text-(--primary)/80">
              Doğrulama kodu
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              autoFocus
              className="mt-1.5 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2.5 text-center text-lg font-bold tracking-[0.5em] outline-none transition focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/35"
            />
          </div>
          <button
            type="submit"
            className="btn-tactile w-full rounded-xl bg-(--secondary) py-3 text-sm font-bold text-white shadow-md shadow-(--secondary)/25 transition hover:bg-brand-hover"
          >
            Doğrula ve giriş yap
          </button>
        </form>

        <form action={resendLoginCode} className="mt-4 text-center">
          <button type="submit" className="text-xs font-semibold text-(--secondary) hover:underline">
            Kod gelmedi mi? Tekrar gönder
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-(--on-surface)/40">Kod 10 dakika geçerlidir.</p>
      </div>
    </div>
  );
}
