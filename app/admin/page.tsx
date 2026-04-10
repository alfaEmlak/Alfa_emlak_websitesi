import { redirect } from "next/navigation";
import { loginAdmin } from "@/app/admin/actions";
import { getAdminSession } from "@/lib/admin-auth";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const session = await getAdminSession();
  if (session.isAdmin) redirect("/admin/dashboard");
  const sp = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--primary)] via-[#0a1f5c] to-[#020818]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[var(--secondary)]/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[var(--secondary)]/10 blur-3xl"
        aria-hidden
      />
      <div className="admin-card relative w-full max-w-md p-8 sm:p-10">
        <p className="label-sm text-center text-[var(--secondary)]">ALFA EMLAK</p>
        <h1 className="admin-page-title mt-2 text-center text-2xl font-bold">Yönetim girişi</h1>
        <p className="mt-1 text-center text-sm text-[var(--on-surface)]/55">Panele erişmek için parolanızı girin</p>
        {sp.e === "1" ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-center text-sm text-red-800 ring-1 ring-red-100">
            Parola hatalı.
          </p>
        ) : null}
        <form action={loginAdmin} className="mt-8 space-y-4">
          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-[var(--primary)]/80">
              Parola
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-xl border border-[var(--ghost-outline)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none ring-[var(--ghost-outline)] transition focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/35"
            />
          </div>
          <button
            type="submit"
            className="btn-tactile w-full rounded-xl bg-[var(--secondary)] py-3 text-sm font-bold text-white shadow-md shadow-[var(--secondary)]/25 transition hover:bg-[var(--brand-hover)]"
          >
            Giriş yap
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-[var(--on-surface)]/40">
          Parola sunucu ayarındaki <span className="font-mono text-[11px]">ADMIN_PASSWORD</span> ile belirlenir.
        </p>
      </div>
    </div>
  );
}
