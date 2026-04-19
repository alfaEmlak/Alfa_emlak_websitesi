import { redirect } from "next/navigation";
import { loginAdmin } from "@/app/karealfaadmin/actions";
import { getPanelUser } from "@/lib/panel-auth";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const user = await getPanelUser();
  if (user) redirect("/karealfaadmin/dashboard");
  const sp = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--primary)] via-[#0a1f5c] to-[#020818]" aria-hidden />
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-(--secondary)/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-(--secondary)/10 blur-3xl" aria-hidden />
      <div className="admin-card relative w-full max-w-md p-8 sm:p-10">
        <p className="label-sm text-center text-(--secondary)">ALFA EMLAK</p>
        <h1 className="admin-page-title mt-2 text-center text-2xl font-bold">Panel girişi</h1>
        <p className="mt-1 text-center text-sm text-(--on-surface)/55">
          Admin parolasını girerseniz yönetim paneline, danışman parolasını girerseniz danışman paneline yönlendirilirsiniz.
        </p>
        {sp.e === "1" ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-center text-sm text-red-800 ring-1 ring-red-100">
            Parola hatalı.
          </p>
        ) : null}
        <form action={loginAdmin} className="mt-8 space-y-4">
          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-(--primary)/80">
              Parola
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2.5 text-sm outline-none ring-(--ghost-outline) transition focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/35"
            />
          </div>
          <button
            type="submit"
            className="btn-tactile w-full rounded-xl bg-(--secondary) py-3 text-sm font-bold text-white shadow-md shadow-(--secondary)/25 transition hover:bg-brand-hover"
          >
            Giriş yap
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-(--on-surface)/40">
          Admin parolası sunucu ayarlarından, danışman parolaları ise veritabanındaki danışman hesaplarından doğrulanır.
        </p>
      </div>
    </div>
  );
}
