"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAgent } from "@/app/karealfaadmin/module-actions";

export function AgentDeleteButton({ agentId, agentName }: { agentId: string; agentName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (pending) return;
    if (!window.confirm(`"${agentName}" danışmanını kalıcı olarak silmek istediğine emin misin? Bu işlem geri alınamaz.`)) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteAgent(agentId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Silme başarısız");
      }
    });
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
      >
        {pending ? "Siliniyor…" : "Danışmanı sil"}
      </button>
      {error ? <p className="mt-1 text-xs font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}
