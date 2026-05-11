"use client";

import type { SocialLinks } from "@/lib/site-settings";

function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function IconLinkedIn({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function IconYouTube({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

const ICON_CLASS = "h-6 w-6";

type Props = {
  social: SocialLinks;
  title: string;
  className?: string;
  /** footer: ortalanmış; iletişim sol kolon: start */
  align?: "center" | "start";
};

/**
 * Yalnızca URL’si dolu olan ağlar gösterilir (admin Site ayarları → Sosyal).
 */
export function SocialLinksBar({ social, title, className = "", align = "center" }: Props) {
  const items = [
    { key: "facebook", url: social.facebook, name: "Facebook", Icon: IconFacebook, wrapClass: "text-[#1877F2] hover:text-[#166FE5]" },
    { key: "instagram", url: social.instagram, name: "Instagram", Icon: IconInstagram, wrapClass: "text-[#E4405F] hover:text-[#d62976]" },
    { key: "linkedin", url: social.linkedin, name: "LinkedIn", Icon: IconLinkedIn, wrapClass: "text-[#0A66C2] hover:text-[#095196]" },
    { key: "youtube", url: social.youtube, name: "YouTube", Icon: IconYouTube, wrapClass: "text-[#FF0000] hover:text-[#cc0000]" },
  ].filter((item) => Boolean(item.url?.trim()));

  if (items.length === 0) return null;

  const colAlign = align === "start" ? "items-start" : "items-center";
  const rowJustify = align === "start" ? "justify-start" : "justify-center";

  return (
    <div className={`flex flex-col gap-4 ${colAlign} ${className}`}>
      <p className="font-headline text-[11px] font-bold uppercase tracking-[0.2em] text-primary/55">{title}</p>
      <ul className={`flex flex-wrap items-center gap-4 sm:gap-5 ${rowJustify}`}>
        {items.map(({ key, url, name, Icon, wrapClass }) => (
          <li key={key}>
            <a
              href={normalizeUrl(url!)}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0_2px_12px_rgba(4,21,70,0.08)] ring-1 ring-slate-100 transition hover:scale-105 hover:shadow-md ${wrapClass}`}
              aria-label={name}
            >
              <Icon className={ICON_CLASS} />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
