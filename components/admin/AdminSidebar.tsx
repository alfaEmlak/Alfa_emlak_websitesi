"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { logoutAdmin } from "@/app/karealfaadmin/actions";
import { AdminIcon, type AdminIconName } from "@/components/admin/AdminIcon";
import { PanelLanguageSwitcher } from "@/components/admin/PanelLanguageSwitcher";

type PanelRole = "ADMIN" | "CONSULTANT";
type NavItem = {
  href: string;
  labelKey: string;
  icon: AdminIconName;
  match: "exact" | "prefix" | "ilanlar";
  adminOnly?: boolean;
  consultantOnly?: boolean;
};
type NavGroup = { titleKey: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    titleKey: "groups.home",
    items: [
      { href: "/karealfaadmin/dashboard", labelKey: "nav.summary", icon: "dashboard", match: "exact" },
      { href: "/karealfaadmin/istatistikler", labelKey: "nav.statistics", icon: "analytics", match: "exact", adminOnly: true },
    ],
  },
  {
    titleKey: "groups.listings",
    items: [
      { href: "/karealfaadmin/ilanlar", labelKey: "nav.allListings", icon: "apartment", match: "ilanlar" },
      { href: "/karealfaadmin/ilanlar/yeni", labelKey: "nav.newListing", icon: "add_circle", match: "exact" },
      { href: "/karealfaadmin/onay-bekleyen", labelKey: "nav.approval", icon: "warning", match: "prefix" },
      { href: "/karealfaadmin/ilanlar/vitrin", labelKey: "nav.showcase", icon: "star", match: "exact", adminOnly: true },
      {
        href: "/karealfaadmin/kocan-belgeler",
        labelKey: "nav.deedsDocuments",
        icon: "documents",
        match: "exact",
        adminOnly: true,
      },
      {
        href: "/karealfaadmin/feed-durum",
        labelKey: "nav.feedStatus",
        icon: "analytics",
        match: "prefix",
        adminOnly: true,
      },
    ],
  },
  {
    titleKey: "groups.contact",
    items: [
      { href: "/karealfaadmin/mesajlar", labelKey: "nav.inbox", icon: "mail", match: "prefix" },
      { href: "/karealfaadmin/kariyer", labelKey: "nav.career", icon: "person_add", match: "prefix", adminOnly: true },
      { href: "/karealfaadmin/kullanici-formlari", labelKey: "nav.userForms", icon: "forum", match: "prefix", adminOnly: true },
    ],
  },
  {
    titleKey: "groups.content",
    items: [
      { href: "/karealfaadmin/blog", labelKey: "nav.blog", icon: "article", match: "prefix", adminOnly: true },
      { href: "/karealfaadmin/menu", labelKey: "nav.siteMenu", icon: "menu", match: "prefix", adminOnly: true },
      { href: "/karealfaadmin/slider-ayarlari", labelKey: "nav.slider", icon: "image", match: "prefix", adminOnly: true },
    ],
  },
  {
    titleKey: "groups.management",
    items: [
      { href: "/karealfaadmin/danismanlar", labelKey: "nav.consultants", icon: "group", match: "prefix", adminOnly: true },
      { href: "/karealfaadmin/danisman-ayarlar", labelKey: "nav.consultantSettings", icon: "person", match: "prefix", consultantOnly: true },
      { href: "/karealfaadmin/lookups", labelKey: "nav.lookups", icon: "list", match: "prefix", adminOnly: true },
      { href: "/karealfaadmin/ayarlar", labelKey: "nav.siteSettings", icon: "settings", match: "prefix", adminOnly: true },
    ],
  },
];

function isLinkActive(pathname: string, href: string, match: NavItem["match"]) {
  if (match === "exact") return pathname === href;
  if (match === "prefix") return pathname === href || pathname.startsWith(`${href}/`);
  if (match === "ilanlar") {
    if (pathname === "/karealfaadmin/ilanlar/yeni") return false;
    if (pathname === "/karealfaadmin/ilanlar/vitrin") return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return false;
}

export function AdminSidebar({
  role,
  pendingCount,
  unreadInboxCount = 0,
  newUserFormsCount = 0,
  pendingAgentsCount = 0,
  userName,
}: {
  role: PanelRole;
  pendingCount: number;
  unreadInboxCount?: number;
  /** Son ziyaretten sonra gelen AI lead formları (yalnızca admin) */
  newUserFormsCount?: number;
  /** Onay bekleyen danışman üyelikleri (yalnızca admin) */
  pendingAgentsCount?: number;
  userName?: string;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("Panel");

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.adminOnly && role !== "ADMIN") return false;
        if (item.consultantOnly && role !== "CONSULTANT") return false;
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-(--primary) text-white shadow-[0_8px_30px_rgb(0,0,0,0.3)] transition-transform active:scale-95 lg:hidden"
        aria-label={t("openMenu")}
      >
        <AdminIcon name="menu" size={24} />
      </button>

      {isOpen && <div className="fixed inset-0 z-40 bg-[#020a24]/50 backdrop-blur-sm lg:hidden" onClick={() => setIsOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-white/10 bg-linear-to-b from-(--primary) via-(--primary) to-[#020a24] text-white shadow-[4px_0_24px_rgba(4,21,70,0.12)] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-6">
          <div>
            <p className="label-sm text-(--secondary)">{t("brand")}</p>
            <p className="mt-1 font-headline text-lg font-bold tracking-tight text-white">{role === "ADMIN" ? t("titleAdmin") : t("titleConsultant")}</p>
            <p className="mt-2 text-xs text-white/55">
              {userName ? t("activeUser", { name: userName }) : role === "ADMIN" ? t("roleAdminShort") : t("roleConsultantShort")}
            </p>
            <div className="mt-3 h-0.5 w-10 rounded-full bg-(--secondary)" aria-hidden />
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <AdminIcon name="close" size={20} />
          </button>
        </div>

        <div className="border-b border-white/10 px-5 py-3">
          <PanelLanguageSwitcher compact />
        </div>

        <nav className="no-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {visibleGroups.map((group, gi) => (
            <div key={group.titleKey} className={gi > 0 ? "mt-4" : ""}>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-white/30">{t(group.titleKey)}</p>
              {group.items.map((item) => {
                const active = isLinkActive(pathname, item.href, item.match);
                const showApprovalBadge = item.href === "/karealfaadmin/onay-bekleyen" && pendingCount > 0;
                const showInboxBadge = item.href === "/karealfaadmin/mesajlar" && unreadInboxCount > 0;
                const showUserFormsBadge = item.href === "/karealfaadmin/kullanici-formlari" && newUserFormsCount > 0;
                const showAgentsBadge = item.href === "/karealfaadmin/danismanlar" && pendingAgentsCount > 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "border-l-[3px] border-(--secondary) bg-white/12 pl-2.25 text-white shadow-inner"
                        : "border-l-[3px] border-transparent pl-2.25 text-white/70 hover:bg-white/6 hover:text-white"
                    }`}
                  >
                    <AdminIcon name={item.icon} size={18} className="shrink-0" />
                    <span className="flex-1">{t(item.labelKey)}</span>
                    {showApprovalBadge ? (
                      <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-900">
                        {pendingCount}
                      </span>
                    ) : null}
                    {showInboxBadge ? (
                      <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {unreadInboxCount > 99 ? "99+" : unreadInboxCount}
                      </span>
                    ) : null}
                    {showUserFormsBadge ? (
                      <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {newUserFormsCount > 99 ? "99+" : newUserFormsCount}
                      </span>
                    ) : null}
                    {showAgentsBadge ? (
                      <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-900">
                        {pendingAgentsCount > 99 ? "99+" : pendingAgentsCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <form className="border-t border-white/10 p-3" action={logoutAdmin}>
          <button type="submit" className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10">
            {t("logout")}
          </button>
        </form>
      </aside>
    </>
  );
}
