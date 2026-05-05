"use client";

import { useCallback, useState } from "react";

type Props = {
  title: string;
  label: string;
  copiedMessage: string;
};

export function ListingShareButton({ title, label, copiedMessage }: Props) {
  const [hint, setHint] = useState<string | null>(null);

  const copyText = useCallback((text: string) => {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return Promise.resolve();
  }, []);

  const onClick = useCallback(async () => {
    const url = window.location.href;
    setHint(null);

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
        return;
      } catch (e) {
        const err = e as { name?: string };
        if (err?.name === "AbortError") return;
      }
    }

    try {
      await copyText(url);
      setHint(copiedMessage);
      window.setTimeout(() => setHint(null), 2500);
    } catch {
      window.prompt("", url);
    }
  }, [title, copiedMessage, copyText]);

  return (
    <div className="relative inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        className="rounded-lg bg-surface-low px-3 py-1.5 text-sm font-medium text-primary ring-1 ring-primary/[0.12] transition hover:bg-surface-high"
      >
        {label}
      </button>
      {hint ? (
        <span className="absolute top-full right-0 z-10 mt-1 whitespace-nowrap rounded-md bg-primary px-2 py-1 text-xs font-medium text-white shadow-md">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
