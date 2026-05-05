"use client";

import { useState, useTransition } from "react";
import { updateAiLeadStatus } from "@/app/karealfaadmin/ai-lead-actions";
import type { LeadStatus } from "@/lib/ai/types";

const OPTIONS: Array<{ value: LeadStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "in_progress", label: "In Progress" },
  { value: "closed", label: "Closed" },
  { value: "rejected", label: "Rejected" },
];

export function StatusEditor({ id, initialStatus }: { id: string; initialStatus: LeadStatus }) {
  const [status, setStatus] = useState<LeadStatus>(initialStatus);
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      try {
        await updateAiLeadStatus(id, status);
        setFeedback("Durum güncellendi.");
      } catch {
        setFeedback("Durum güncellenemedi.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as LeadStatus)}
        className="rounded-lg border border-(--ghost-outline) bg-white px-3 py-2 text-sm"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={save}
        disabled={isPending}
        className="rounded-lg bg-(--primary) px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPending ? "Kaydediliyor..." : "Durumu Güncelle"}
      </button>
      {feedback ? <span className="text-xs text-(--on-surface)/60">{feedback}</span> : null}
    </div>
  );
}
