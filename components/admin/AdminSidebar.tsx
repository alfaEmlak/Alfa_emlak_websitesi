"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAdmin } from "@/app/karealfaadmin/actions";
import { AdminIcon, type AdminIconName } from "@/components/admin/AdminIcon";

const links: Array<{ href: string; label: string; icon: AdminIconName; match: "exact" | "prefix" | "ilanlar" }> = [
  { href: "/karealfaadmin/dashboard", label: "Özet", icon: "dashboard", match: "exact" as const },
  { href: "/karealfaadmin/ilanlar", label: "Tüm ilanlar", icon: "apartment", match: "ilanlar" as const },
  { href: "/karealfaadmin/ilanlar/yeni", label: "Yeni ilan", icon: "add_circle", match: "exact" as const },
  { href: "/karealfaadmin/mesajlar", label: "Gelen Kutusu", icon: "mail", match: "prefix" as const },
  { href: "/karealfaadmin/blog", label: "Blog", icon: "article", match: "prefix" as const },
  { href: "/karealfaadmin/danismanlar", label: "Danışmanlar", icon: "group", match: "prefix" as const },
  { href: "/karealfaadmin/menu", label: "Menü", icon: "menu", match: "prefix" as const },
  { href: "/karealfaadmin/ayarlar", label: "Site ayarları", icon: "settings", match: "prefix" as const },
];

function isLinkActive(pathname: string, href: string, match: (typeof links)[number]["match"]) {
  if (match === "exact") return pathname === href;
  if (match === "prefix") return pathname === href || pathname.startsWith(`${href}/`);
  if (match === "ilanlar") {
    if (pathname === "/karealfaadmin/ilanlar/yeni") return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return false;
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-linear-to-b from-(--primary) via-(--primary) to-[#020a24] text-white shadow-[4px_0_24px_rgba(4,21,70,0.12)]">
      <div className="border-b border-white/10 px-5 py-6">
        <p className="label-sm text-(--secondary)">ALFA EMLAK</p>
        <p className="mt-1 font-headline text-lg font-bold tracking-tight text-white">Yönetim paneli</p>
        <div className="mt-3 h-0.5 w-10 rounded-full bg-(--secondary)" aria-hidden />
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {links.map((l) => {
          const active = isLinkActive(pathname, l.href, l.match);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-l-[3px] border-(--secondary) bg-white/12 pl-2.25 text-white shadow-inner"
                  : "border-l-[3px] border-transparent pl-2.25 text-white/70 hover:bg-white/6 hover:text-white"
              }`}
            >
              <AdminIcon name={l.icon} size={18} className="shrink-0" />
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
