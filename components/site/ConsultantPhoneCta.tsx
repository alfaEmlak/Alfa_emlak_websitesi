"use client";

import { useState } from "react";

/** İlan detayında numarayı önce gizler; tıklanınca gösterir ve aramak için tel: bağlantısı sunar. */
export function ConsultantPhoneCta({ phone, showLabel }: { phone: string; showLabel: string }) {
  const [revealed, setRevealed] = useState(false);
  const tel = phone.replace(/\s/g, "");
  if (!phone.trim()) return null;

  if (!revealed) {
    return (
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="btn-tactile btn-primary-gradient w-full rounded-xl py-3 text-center text-sm font-bold text-white"
      >
        {showLabel}
      </button>
    );
  }

  return (
    <a
      href={`tel:${tel}`}
      className="btn-tactile btn-primary-gradient block w-full rounded-xl py-3 text-center text-sm font-bold text-white"
    >
      {phone.trim()}
    </a>
  );
}
