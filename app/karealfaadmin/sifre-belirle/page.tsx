import Link from "next/link";
import { resetPasswordWithToken } from "@/app/karealfaadmin/actions";
import { isResetTokenValid } from "@/lib/password-reset";

export default async function SetNewPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; e?: string }>;
}) {
  const sp = await searchParams;
  const token = (sp.token ?? "").trim();
  const valid = token ? await isResetTokenValid(token) : false;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-(--primary) via-[#0a1f5c] to-[#020818]" aria-hidden />
      <div className="admin-card relative w-full max-w-md p-8 sm:p-10">
        <p className="label-sm text-center text-(--secondary)">ALFA EMLAK</p>
        <h1 className="admin-page-title mt-2 text-center text-2xl font-bold">Yeni şifre belirle</h1>

        {!valid || sp.e === "invalid" ? (
          <>
            <p className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-center text-sm text-red-800 ring-1 ring-red-100">
              Bu sıfırlama bağlantısı geçersiz veya süresi dolmuş. Lütfen yeniden talep edin.
            </p>
            <p className="mt-6 text-center text-xs">
              <Link href="/karealfaadmin/sifre-sifirla" className="font-semibold text-(--secondary) hover:underline">
                Yeni bağlantı iste
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-center text-sm text-(--on-surface)/55">Hesabınız için yeni bir şifre girin.</p>

            {sp.e === "short" ? (
              <p className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-center text-sm text-red-800 ring-1 ring-red-100">
                Şifre en az 6 karakter olmalı.
              </p>
            ) : null}
            {sp.e === "mismatch" ? (
              <p className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-center text-sm text-red-800 ring-1 ring-red-100">
                Şifreler eşleşmiyor.
              </p>
            ) : null}

            <form action={resetPasswordWithToken} className="mt-8 space-y-4">
              <input type="hidden" name="token" value={token} />
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-(--primary)/80">
                  Yeni şifre
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  minLength={6}
                  required
                  autoComplete="new-password"
                  className="mt-1.5 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2.5 text-sm outline-none transition focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/35"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="block text-xs font-semibold text-(--primary)/80">
                  Yeni şifre (tekrar)
                </label>
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  minLength={6}
                  required
                  autoComplete="new-password"
                  className="mt-1.5 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2.5 text-sm outline-none transition focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/35"
                />
              </div>
              <button
                type="submit"
                className="btn-tactile w-full rounded-xl bg-(--secondary) py-3 text-sm font-bold text-white shadow-md shadow-(--secondary)/25 transition hover:bg-brand-hover"
              >
                Şifreyi kaydet
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
