"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { reorderAgents } from "@/app/karealfaadmin/module-actions";

type AgentLite = {
  id: string;
  name: string | null;
  title: string | null;
  photo: string | null;
};

const DND_PAYLOAD = "application/x-alfa-agent-idx";

export function AgentReorder({ initial }: { initial: AgentLite[] }) {
  const [items, setItems] = useState<AgentLite[]>(initial);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = items.some((a, i) => a.id !== initial[i]?.id);

  function move(from: number, to: number) {
    if (from === to) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setSaved(false);
  }

  function onDrop(e: React.DragEvent, to: number) {
    e.preventDefault();
    const raw = e.dataTransfer.getData(DND_PAYLOAD);
    const from = raw ? Number(raw) : dragIdx;
    if (from != null && Number.isFinite(from)) move(from, to);
    setDragIdx(null);
  }

  function handleSave() {
    startTransition(async () => {
      await reorderAgents(items.map((a) => a.id));
      setSaved(true);
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-zinc-800">Listeleme sırası</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Sürükleyip bırakarak sırayı değiştirin, sonra kaydedin.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || !dirty}
          className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-40"
        >
          {pending ? "Kaydediliyor..." : saved && !dirty ? "Kaydedildi" : "Sırayı kaydet"}
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((a, i) => (
          <li
            key={a.id}
            draggable
            onDragStart={(e) => {
              setDragIdx(i);
              e.dataTransfer.setData(DND_PAYLOAD, String(i));
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, i)}
            onDragEnd={() => setDragIdx(null)}
            className={`flex cursor-grab items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 active:cursor-grabbing ${
              dragIdx === i ? "opacity-50" : ""
            }`}
          >
            <span className="w-6 shrink-0 text-center text-xs font-bold text-zinc-400">{i + 1}</span>
            <span className="text-zinc-300">⋮⋮</span>
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
              {a.photo ? (
                <Image src={a.photo} alt={a.name || ""} fill className="object-cover" sizes="36px" unoptimized />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                  {(a.name || "?").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-800">{a.name || "—"}</p>
              <p className="truncate text-xs text-zinc-500">{a.title || "Emlak Danışmanı"}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
