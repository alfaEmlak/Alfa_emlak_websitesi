"use client";

import { useState, useTransition } from "react";
import { adminGenerateTempPassword, type TempPasswordResult } from "@/app/karealfaadmin/module-actions";

export function AgentTempPassword({ agentId }: { agentId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<TempPasswordResult | null>(null);

  function handleClick() {
    if (pending) return;
    if (!window.confirm("Bu danışman için yeni bir geçici şifre üretilecek ve mevcut şifresi geçersiz olacak. Devam edilsin mi?")) {
      return;
    }
    startTransition(async () => {
      const r = await adminGenerateTempPassword(agentId);
      setResult(r);
    });
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
      >
        {pending ? "Üretiliyor…" : "Geçici şifre üret + mail gönder"}
      </button>

      {result?.ok ? (
        <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs">
          <p className="text-zinc-500">Geçici şifre:</p>
          <p className="mt-0.5 select-all font-mono text-sm font-bold text-zinc-800">{result.password}</p>
          {result.emailed ? (
            <p className="mt-1 text-emerald-700">E-posta gönderildi. İlk girişte şifre değiştirmesi istenir.</p>
          ) : (
            <p className="mt-1 text-amber-700">
              E-posta gönderilemedi{result.emailError ? `: ${result.emailError}` : ""}. Şifreyi danışmana elle iletin.
            </p>
          )}
        </div>
      ) : null}
      {result && !result.ok ? (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{result.error}</p>
      ) : null}
    </div>
  );
}
