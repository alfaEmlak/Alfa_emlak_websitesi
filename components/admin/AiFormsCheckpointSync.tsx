"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { finalizeAiFormsVisit } from "@/app/karealfaadmin/ai-forms-actions";

const PREFIX = "/karealfaadmin/kullanici-formlari";

/**
 * Admin panelde route değişince: kullanıcı formları rotasından tamamen çıkılırsa checkpoint güncellenir.
 */
export function AiFormsCheckpointSync() {
  const pathname = usePathname();
  const router = useRouter();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;

    if (prev == null) return;

    const wasInside = prev === PREFIX || prev.startsWith(`${PREFIX}/`);
    const nowInside = pathname === PREFIX || pathname.startsWith(`${PREFIX}/`);
    if (wasInside && !nowInside) {
      void finalizeAiFormsVisit().then(() => router.refresh());
    }
  }, [pathname, router]);

  return null;
}
