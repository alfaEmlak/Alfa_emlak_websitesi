"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAdmin } from "@/app/admin/actions";

const links = [
  { href: "/admin/dashboard", label: "Özet", match: "exact" as const },
  { href: "/admin/ilanlar", label: "Tüm ilanlar", match: "ilanlar" as const },
  { href: "/admin/ilanlar/yeni", label: "Yeni ilan", match: "exact" as const },
  { href: "/admin/menu", label: "Menü", match: "prefix" as const },
  { href: "/admin/ayarlar", label: "Site ayarları", match: "prefix" as const },
];

function isLinkActive(pathname: string, href: string, match: (typeof links)[number]["match"]) {
  if (match === "exact") return pathname === href;
  if (match === "prefix") return pathname === href || pathname.startsWith(`${href}/`);
  if (match === "ilanlar") {
    if (pathname === "/admin/ilanlar/yeni") return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return false;
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-[var(--primary)] via-[var(--primary)] to-[#020a24] text-white shadow-[4px_0_24px_rgba(4,21,70,0.12)]">
      <div className="border-b border-white/10 px-5 py-6">
        <p className="label-sm text-[var(--secondary)]">ALFA EMLAK</p>
        <p className="mt-1 font-headline text-lg font-bold tracking-tight text-white">Yönetim paneli</p>
        <div className="mt-3 h-0.5 w-10 rounded-full bg-[var(--secondary)]" aria-hidden />
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {links.map((l) => {
          const active = isLinkActive(pathname, l.href, l.match);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-l-[3px] border-[var(--secondary)] bg-white/[0.12] pl-[calc(0.75rem-3px)] text-white shadow-inner"
                  : "border-l-[3px] border-transparent pl-[calc(0.75rem-3px)] text-white/70 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <form className="border-t border-white/10 p-3" action={logoutAdmin}>
        <button
          type="submit"
          className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10"
        >
          Çıkış
        </button>
      </form>
    </aside>
  );
}
