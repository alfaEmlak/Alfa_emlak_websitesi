import "../globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { getPanelLocale } from "@/lib/panel-locale";

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getPanelLocale();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} dir={locale === "fa" ? "rtl" : "ltr"} className="antialiased scroll-smooth">
      <body className="flex min-h-full flex-col bg-[#f8f9fa] font-sans text-slate-800">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
