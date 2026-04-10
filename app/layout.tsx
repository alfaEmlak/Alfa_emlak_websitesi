import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, Manrope } from "next/font/google";
import "./material-symbols.css";
import "./globals.css";
import { getSiteSettingsOrFallback } from "@/lib/site-settings";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${manrope.variable} ${inter.variable} ${prestigeSerif.variable} scroll-smooth antialiased`}
      style={{ colorScheme: "light" }}
    >
      <body className="flex min-h-full flex-col bg-surface font-sans text-on-surface selection:bg-secondary/30">{children}</body>
    </html>
  );
}
