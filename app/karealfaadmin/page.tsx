import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { loginAdmin, registerConsultant } from "@/app/karealfaadmin/actions";
import { PanelLanguageSwitcher } from "@/components/admin/PanelLanguageSwitcher";
import { getPanelUser } from "@/lib/panel-auth";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; registered?: string }>;
}) {
  const user = await getPanelUser();
  if (user) redirect("/karealfaadmin/dashboard");
  const sp = await searchParams;
  const t = await getTranslations("Panel");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-(--primary) via-[#0a1f5c] to-[#020818]" aria-hidden />
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-(--secondary)/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-(--secondary)/10 blur-3xl" aria-hidden />

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <PanelLanguageSwitcher />
      </div>

      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="admin-card relative p-8 sm:p-10">
          <p className="label-sm text-center text-(--secondary)">{t("brand")}</p>
          <h1 className="admin-page-title mt-2 text-center text-2xl font-bold">{t("loginHeading")}</h1>
          <p className="mt-1 text-center text-sm text-(--on-surface)/55">{t("loginSubtitle")}</p>
          {sp.e === "1" ? (
            <p className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-center text-sm text-red-800 ring-1 ring-red-100">{t("errBadCredentials")}</p>
          ) : null}
          {sp.e === "pending" ? (
            <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-center text-sm text-amber-800 ring-1 ring-amber-100">{t("errPending")}</p>
          ) : null}
          {sp.e === "exists" ? (
            <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-center text-sm text-amber-800 ring-1 ring-amber-100">{t("errExists")}</p>
          ) : null}
          {sp.e === "register" ? (
            <p className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-center text-sm text-red-800 ring-1 ring-red-100">{t("errRegister")}</p>
          ) : null}
          {sp.registered === "1" ? (
            <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2.5 text-center text-sm text-emerald-800 ring-1 ring-emerald-100">{t("successRegistered")}</p>
          ) : null}
          <form action={loginAdmin} className="mt-8 space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-(--primary)/80">
                {t("labelEmail")}
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mt-1.5 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2.5 text-sm outline-none ring-(--ghost-outline) transition focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/35"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-(--primary)/80">
                {t("labelPassword")}
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
              {t("loginSubmit")}
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-(--on-surface)/40">{t("loginFooterNote")}</p>
        </div>

        <div className="admin-card relative p-8 sm:p-10">
          <p className="label-sm text-center text-(--secondary)">{t("registerSectionLabel")}</p>
          <h2 className="admin-page-title mt-2 text-center text-2xl font-bold">{t("registerHeading")}</h2>
          <p className="mt-1 text-center text-sm text-(--on-surface)/55">{t("registerSubtitle")}</p>
          <form action={registerConsultant} className="mt-8 space-y-4">
            <div>
              <label htmlFor="register-name" className="block text-xs font-semibold text-(--primary)/80">
                {t("labelName")}
              </label>
              <input
                id="register-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                className="mt-1.5 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2.5 text-sm outline-none ring-(--ghost-outline) transition focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/35"
              />
            </div>
            <div>
              <label htmlFor="register-email" className="block text-xs font-semibold text-(--primary)/80">
                {t("labelEmail")}
              </label>
              <input
                id="register-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mt-1.5 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2.5 text-sm outline-none ring-(--ghost-outline) transition focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/35"
              />
            </div>
            <div>
              <label htmlFor="register-phone" className="block text-xs font-semibold text-(--primary)/80">
                {t("labelPhone")}
              </label>
              <input
                id="register-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                className="mt-1.5 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2.5 text-sm outline-none ring-(--ghost-outline) transition focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/35"
              />
            </div>
            <div>
              <label htmlFor="register-password" className="block text-xs font-semibold text-(--primary)/80">
                {t("labelPassword")}
              </label>
              <input
                id="register-password"
                name="password"
                type="password"
                minLength={6}
                required
                autoComplete="new-password"
                className="mt-1.5 w-full rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2.5 text-sm outline-none ring-(--ghost-outline) transition focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/35"
              />
            </div>
            <button
              type="submit"
              className="btn-tactile w-full rounded-xl bg-(--primary) py-3 text-sm font-bold text-white shadow-md shadow-(--primary)/20 transition hover:bg-brand-hover"
            >
              {t("registerRequestSubmit")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
