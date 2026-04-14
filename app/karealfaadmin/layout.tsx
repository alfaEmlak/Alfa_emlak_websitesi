import "../globals.css";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="antialiased scroll-smooth">
      <body className="flex min-h-full flex-col bg-[#f8f9fa] font-sans text-slate-800">
        {children}
      </body>
    </html>
  );
}
