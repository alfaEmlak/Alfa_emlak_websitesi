import Link from "next/link";
import { requestPasswordReset } from "@/app/karealfaadmin/actions";

export default async function RequestResetPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-(--primary) via-[#0a1f5c] to-[#020818]" aria-hidden />
      <div className="admin-card relative w-full max-w-md p-8 sm:p-10">
        <p className="label-sm text-center text-(--secondary)">ALFA EMLAK</p>
        <h1 className="admin-page-title mt-2 text-center text-2xl font-bold">Şifremi unuttum</h1>
        <p className="mt-1 text-center text-sm text-(--on-surface)/55">
          Hesabınızın e-posta adresini girin; size şifre sıfırlama bağlantısı gönderelim.
        </p>

        {sp.sent === "1" ? (
          <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2.5 text-center text-sm text-emerald-800 ring-1 ring-emerald-100">
            Bu e-posta sistemde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi. Gelen kutunuzu (ve spam klasörünü) kontrol edin.
          </p>
        ) : (
          <form action={requestPasswordReset} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-(--primary)/80">
                E-posta
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mt-1.5 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2.5 text-sm outline-none transition focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/35"
              />
            </div>
            <button
              type="submit"
              className="btn-tactile w-full rounded-xl bg-(--secondary) py-3 text-sm font-bold text-white shadow-md shadow-(--secondary)/25 transition hover:bg-brand-hover"
            >
              Sıfırlama bağlantısı gönder
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs">
          <Link href="/karealfaadmin" className="font-semibold text-(--secondary) hover:underline">
            Girişe dön
          </Link>
        </p>
      </div>
    </div>
  );
}
