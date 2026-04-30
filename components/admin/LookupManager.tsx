"use client";

import { useMemo, useState, useTransition } from "react";
import {
  deleteLookupRow,
  saveLookupRow,
  toggleLookupActive,
} from "@/app/karealfaadmin/lookup-actions";
import { LOOKUP_TABLES, type LookupTableName, type LookupTableKind } from "@/lib/feeds/lookup-meta";
import { useRouter } from "next/navigation";

type SimpleRow = { id: number; label: string; sort: number; is_active: boolean };
type AreaRow = SimpleRow & { city: string };
type CurrencyRow = { iso: string; code: number | string; label: string; is_active: boolean };
type AdSpecRow = { tag: string; label_tr: string; label_en: string | null; sort: number; is_active: boolean };
type AnyRow = SimpleRow | AreaRow | CurrencyRow | AdSpecRow;

export type LookupTabData = {
  table: LookupTableName;
  meta: { kind: LookupTableKind; label: string };
  rows: AnyRow[];
};

type Props = { tabs: LookupTabData[] };

export function LookupManager({ tabs }: Props) {
  const router = useRouter();
  const [active, setActive] = useState<LookupTableName>(tabs[0]?.table ?? "ref_101_types");
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const activeTab = tabs.find((t) => t.table === active) ?? tabs[0];
  const meta = activeTab?.meta ?? LOOKUP_TABLES[active];

  const filteredRows = useMemo(() => {
    const q = filter.trim().toLocaleLowerCase("tr-TR");
    if (!q) return activeTab?.rows ?? [];
    return (activeTab?.rows ?? []).filter((r) => {
      return Object.values(r).some((v) => String(v ?? "").toLocaleLowerCase("tr-TR").includes(q));
    });
  }, [activeTab, filter]);

  function notify(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!fd.get("is_active")) fd.set("is_active", "0");
    startTransition(async () => {
      const res = await saveLookupRow(active, fd);
      if (res.ok) {
        notify("success", "Kaydedildi.");
        (e.target as HTMLFormElement).reset();
        router.refresh();
      } else {
        notify("error", res.error);
      }
    });
  }

  function handleDelete(pk: { id?: number; iso?: string; tag?: string }) {
    if (!confirm("Bu kaydı silmek istediğinize emin misiniz?")) return;
    startTransition(async () => {
      const res = await deleteLookupRow(active, pk);
      if (res.ok) {
        notify("success", "Silindi.");
        router.refresh();
      } else {
        notify("error", res.error);
      }
    });
  }

  function handleToggle(pk: { id?: number; iso?: string; tag?: string }, isActive: boolean) {
    startTransition(async () => {
      const res = await toggleLookupActive(active, pk, isActive);
      if (res.ok) {
        router.refresh();
      } else {
        notify("error", res.error);
      }
    });
  }

  const tabsByGroup = useMemo(() => {
    const g101 = tabs.filter((t) => t.table.startsWith("ref_101_"));
    const ghg = tabs.filter((t) => t.table.startsWith("ref_hangiev_"));
    return { g101, ghg };
  }, [tabs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-1">
          <span className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">101evler</span>
          {tabsByGroup.g101.map((t) => (
            <TabButton key={t.table} active={active === t.table} onClick={() => setActive(t.table)} label={t.meta.label.replace("101evler · ", "")} />
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          <span className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-sky-700">Hangiev</span>
          {tabsByGroup.ghg.map((t) => (
            <TabButton key={t.table} active={active === t.table} onClick={() => setActive(t.table)} label={t.meta.label.replace("Hangiev · ", "")} />
          ))}
        </div>
      </div>

      {message && (
        <div className={`rounded-xl border px-4 py-2 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {message.text}
        </div>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-zinc-800">{meta.label}</h2>
          <input
            type="search"
            placeholder="Filtrele..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
          />
        </header>

        <LookupForm kind={meta.kind} pending={pending} onSubmit={handleSubmit} />

        <div className="mt-6 overflow-x-auto">
          <LookupTable
            kind={meta.kind}
            rows={filteredRows}
            pending={pending}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        </div>
      </section>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-emerald-600 text-white shadow"
          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
      }`}
    >
      {label}
    </button>
  );
}

function LookupForm({
  kind,
  pending,
  onSubmit,
}: {
  kind: LookupTableKind;
  pending: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3 rounded-xl bg-zinc-50 p-4 sm:grid-cols-2 lg:grid-cols-6">
      {kind === "currency" && (
        <>
          <Field name="iso" label="ISO (TRY/EUR/USD)" required uppercase />
          <Field name="code" label="Kod" required />
          <Field name="label" label="Etiket" required colSpan={2} />
        </>
      )}
      {kind === "ad_spec" && (
        <>
          <Field name="tag" label="Tag (XML)" required />
          <Field name="label_tr" label="Etiket (TR)" required />
          <Field name="label_en" label="Etiket (EN)" />
          <Field name="sort" label="Sıra" type="number" />
        </>
      )}
      {kind === "simple" && (
        <>
          <Field name="id" label="ID" type="number" required />
          <Field name="label" label="Etiket" required colSpan={2} />
          <Field name="sort" label="Sıra" type="number" />
        </>
      )}
      {kind === "area" && (
        <>
          <Field name="id" label="ID" type="number" required />
          <Field name="city" label="Şehir" required placeholder="Lefkoşa, Girne, ..." />
          <Field name="label" label="Bölge" required colSpan={2} />
          <Field name="sort" label="Sıra" type="number" />
        </>
      )}
      <label className="col-span-2 flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_active" value="1" defaultChecked className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500/20" />
        Aktif
      </label>
      <div className="col-span-full flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Kaydediliyor..." : "Kaydet / Güncelle"}
        </button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  placeholder,
  colSpan,
  uppercase,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  colSpan?: number;
  uppercase?: boolean;
}) {
  const span = colSpan ? `sm:col-span-${colSpan}` : "";
  return (
    <label className={`block text-sm font-medium text-zinc-700 ${span}`}>
      <span>
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className={`mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 ${
          uppercase ? "uppercase" : ""
        }`}
      />
    </label>
  );
}

function LookupTable({
  kind,
  rows,
  pending,
  onToggle,
  onDelete,
}: {
  kind: LookupTableKind;
  rows: AnyRow[];
  pending: boolean;
  onToggle: (pk: { id?: number; iso?: string; tag?: string }, isActive: boolean) => void;
  onDelete: (pk: { id?: number; iso?: string; tag?: string }) => void;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-zinc-400">Henüz kayıt yok.</p>;
  }

  return (
    <table className="min-w-full text-sm">
      <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
        <tr>
          {kind === "currency" && (
            <>
              <th className="px-3 py-2 text-left">ISO</th>
              <th className="px-3 py-2 text-left">Kod</th>
              <th className="px-3 py-2 text-left">Etiket</th>
            </>
          )}
          {kind === "ad_spec" && (
            <>
              <th className="px-3 py-2 text-left">Tag</th>
              <th className="px-3 py-2 text-left">Etiket (TR)</th>
              <th className="px-3 py-2 text-left">Etiket (EN)</th>
              <th className="px-3 py-2 text-left">Sıra</th>
            </>
          )}
          {kind === "simple" && (
            <>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Etiket</th>
              <th className="px-3 py-2 text-left">Sıra</th>
            </>
          )}
          {kind === "area" && (
            <>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Şehir</th>
              <th className="px-3 py-2 text-left">Bölge</th>
              <th className="px-3 py-2 text-left">Sıra</th>
            </>
          )}
          <th className="px-3 py-2 text-left">Aktif</th>
          <th className="px-3 py-2 text-right">İşlemler</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100">
        {rows.map((r) => {
          const pk =
            kind === "currency"
              ? { iso: (r as CurrencyRow).iso }
              : kind === "ad_spec"
                ? { tag: (r as AdSpecRow).tag }
                : { id: (r as SimpleRow).id };
          const key =
            "iso" in r ? `iso-${(r as CurrencyRow).iso}` :
            "tag" in r ? `tag-${(r as AdSpecRow).tag}` :
            `id-${(r as SimpleRow).id}`;
          return (
            <tr key={key}>
              {kind === "currency" && (
                <>
                  <td className="px-3 py-2 font-medium">{(r as CurrencyRow).iso}</td>
                  <td className="px-3 py-2">{String((r as CurrencyRow).code)}</td>
                  <td className="px-3 py-2">{(r as CurrencyRow).label}</td>
                </>
              )}
              {kind === "ad_spec" && (
                <>
                  <td className="px-3 py-2 font-mono text-xs">{(r as AdSpecRow).tag}</td>
                  <td className="px-3 py-2">{(r as AdSpecRow).label_tr}</td>
                  <td className="px-3 py-2 text-zinc-500">{(r as AdSpecRow).label_en ?? "—"}</td>
                  <td className="px-3 py-2 text-zinc-500">{(r as AdSpecRow).sort}</td>
                </>
              )}
              {kind === "simple" && (
                <>
                  <td className="px-3 py-2 font-mono text-xs">{(r as SimpleRow).id}</td>
                  <td className="px-3 py-2">{(r as SimpleRow).label}</td>
                  <td className="px-3 py-2 text-zinc-500">{(r as SimpleRow).sort}</td>
                </>
              )}
              {kind === "area" && (
                <>
                  <td className="px-3 py-2 font-mono text-xs">{(r as AreaRow).id}</td>
                  <td className="px-3 py-2">{(r as AreaRow).city}</td>
                  <td className="px-3 py-2">{(r as AreaRow).label}</td>
                  <td className="px-3 py-2 text-zinc-500">{(r as AreaRow).sort}</td>
                </>
              )}
              <td className="px-3 py-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onToggle(pk, !r.is_active)}
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    r.is_active
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                  }`}
                >
                  {r.is_active ? "Aktif" : "Pasif"}
                </button>
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onDelete(pk)}
                  className="text-xs font-medium text-rose-600 hover:underline disabled:opacity-50"
                >
                  Sil
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
