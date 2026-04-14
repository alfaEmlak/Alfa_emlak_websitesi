import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getAdminSession } from "@/lib/admin-auth";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session.isAdmin) redirect("/karealfaadmin");

  // Admin panel lives outside the [locale] segment, so there is no locale in the
  // URL. `i18n/request.ts` falls back to the default locale when none is present,
  // which is what we want here — we just need a provider in the tree so client
  // components like <ListingEditor> can call useTranslations().
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="admin-scroll admin-shell flex-1 overflow-x-auto text-[var(--on-surface)]">{children}</div>
      </div>
    </NextIntlClientProvider>
  );
}
