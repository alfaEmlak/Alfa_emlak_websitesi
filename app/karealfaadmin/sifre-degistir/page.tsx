import { redirect } from "next/navigation";
import { getPanelUser } from "@/lib/panel-auth";
import { changeMyPassword } from "@/app/karealfaadmin/actions";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const user = await getPanelUser();
  if (!user) redirect("/karealfaadmin");
  // Sadece DB hesapları (danışman/yönetici yetkili danışman) şifre değiştirir; env super-admin değil.
  if (!user.agentId) redirect("/karealfaadmin/dashboard");
  const sp = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-(--primary) via-[#0a1f5c] to-[#020818]" aria-hidden />
      <div className="admin-card relative w-full max-w-md p-8 sm:p-10">
        <p className="label-sm text-center text-(--secondary)">ALFA EMLAK</p>
        <h1 className="admin-page-title mt-2 text-center text-2xl font-bold">Yeni şifre belirleyin</h1>
        <p className="mt-1 text-center text-sm text-(--on-surface)/55">
          {user.mustChangePassword
            ? "Devam etmek için geçici şifrenizi değiştirin."
            : "Hesabınız için yeni bir şifre belirleyin."}
        </p>

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

        <form action={changeMyPassword} className="mt-8 space-y-4">
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
      </div>
    </div>
  );
}
