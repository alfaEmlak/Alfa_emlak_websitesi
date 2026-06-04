import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, Manrope } from "next/font/google";
import "../material-symbols.css";
import "../globals.css";
import { getSiteSettingsOrFallback } from "@/lib/site-settings";
import MetaPixel from "@/components/site/MetaPixel";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

/** Hero “prestijli” — ince lüks serif (Manrope/Inter dışında) */
const prestigeSerif = Cormorant_Garamond({
  variable: "--font-prestijli",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettingsOrFallback();
  return {
    title: s.seoTitle || "ALFA EMLAK | Kıbrıs'ın Lüks Emlak Rehberi",
    description: s.seoDescription || "Satılık, kiralık ve seçkin portföy — ALFA EMLAK",
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={locale === "fa" ? "rtl" : "ltr"}
      className={`${manrope.variable} ${inter.variable} ${prestigeSerif.variable} scroll-smooth antialiased`}
      style={{ colorScheme: "light" }}
    >
      <body className="flex min-h-full flex-col bg-surface font-sans text-on-surface selection:bg-secondary/30">
        <MetaPixel />
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
