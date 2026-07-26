"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { exportListingsCsv, runBulkAction } from "@/app/karealfaadmin/bulk-actions";
import { useBulkSelection } from "@/components/admin/BulkSelectionProvider";
import {
  DESTRUCTIVE_BULK_ACTIONS,
  type BulkAction,
  type BulkPayload,
} from "@/components/admin/bulk-types";

export type BulkDrawerOptions = {
  agents: { id: string; name: string }[];
  cities: { value: string; label: string }[];
  propertyTypes: { value: string; label: string }[];
  kinds: { value: string; label: string }[];
  /** publish_status kodu → görünen etiket (panel çevirilerinden). */
  statusLabels: Record<string, string>;
};

export type BulkDrawerLabels = {
  title: string;
  scopeSelection: string;
  scopeFilter: string;
  close: string;
  back: string;
  run: string;
  running: string;
  cancel: string;
  confirmTypeCount: string;
  confirmPlaceholder: string;
  irreversible: string;
  reversible: string;
  resultSuccess: string;
  resultSkipped: string;
  resultError: string;
  noteNoPhoto: string;
  noteFeaturedLimit: string;
  noteFeedFlagsReset: string;
  groups: { status: string; moderation: string; assign: string; content: string; feed: string; export: string; danger: string };
  actions: Record<string, { label: string; description: string }>;
  fields: {
    status: string;
    decision: string;
    approve: string;
    reject: string;
    agent: string;
    featuredOn: string;
    featuredOff: string;
    priceMode: string;
    pricePercent: string;
    priceAmount: string;
    priceValue: string;
    priceRounding: string;
    priceHint: string;
    export101: string;
    exportHangiev: string;
    on: string;
    off: string;
    unchanged: string;
    kind: string;
    propertyType: string;
    city: string;
    region: string;
    taxonomyHint: string;
    csvHint: string;
    choose: string;
  };
  errors: Record<string, string>;
};

/** Drawer'daki tek bir seçenek; "csv" gerçek bir mutasyon değil. */
type DrawerAction = BulkAction | "csv";

type ActionGroup = {
  key: keyof BulkDrawerLabels["groups"];
  actions: DrawerAction[];
};

const GROUPS: ActionGroup[] = [
  { key: "status", actions: ["set_status"] },
  { key: "moderation", actions: ["review"] },
  { key: "assign", actions: ["assign_agent"] },
  { key: "content", actions: ["set_featured", "update_price", "set_taxonomy"] },
  { key: "feed", actions: ["set_feed_flags"] },
  { key: "export", actions: ["csv"] },
  { key: "danger", actions: ["soft_delete"] },
];

const SETTABLE_STATUSES = ["PUBLISHED", "DRAFT", "HIDDEN"] as const;

export function BulkActionsDrawer({
  onClose,
  labels,
  options,
}: {
  onClose: () => void;
  labels: BulkDrawerLabels;
  options: BulkDrawerOptions;
}) {
  const router = useRouter();
  const { count, allMatchingSelected, buildTarget, clear } = useBulkSelection();
  const [action, setAction] = useState<DrawerAction | null>(null);
  const [payload, setPayload] = useState<BulkPayload>({});
  const [confirmText, setConfirmText] = useState("");
  const [result, setResult] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isDestructive = action !== null && action !== "csv" && DESTRUCTIVE_BULK_ACTIONS.includes(action);
  const confirmOk = !isDestructive || confirmText.trim() === String(count);

  function reset() {
    setAction(null);
    setPayload({});
    setConfirmText("");
    setResult(null);
  }

  function execute() {
    if (!action) return;
    const target = buildTarget();

    startTransition(async () => {
      if (action === "csv") {
        const res = await exportListingsCsv(target);
        if (!res.ok) {
          setResult({ kind: "err", text: labels.errors[res.error] ?? labels.resultError });
          return;
        }
        downloadCsv(res.csv);
        setResult({ kind: "ok", text: labels.resultSuccess.replace("{count}", String(res.rows)) });
        return;
      }

      const res = await runBulkAction({ target, action, payload });
      if (!res.ok) {
        setResult({ kind: "err", text: labels.errors[res.error] ?? labels.resultError });
        return;
      }

      const parts = [labels.resultSuccess.replace("{count}", String(res.affected))];
      if (res.skipped > 0) parts.push(labels.resultSkipped.replace("{count}", String(res.skipped)));
      if (res.note === "no_photo") parts.push(labels.noteNoPhoto);
      if (res.note === "featured_limit") parts.push(labels.noteFeaturedLimit);
      if (res.note === "feed_flags_reset") parts.push(labels.noteFeedFlagsReset);

      setResult({ kind: "ok", text: parts.join(" ") });
      clear();
      router.refresh();
    });
  }

  const scopeText = allMatchingSelected
    ? labels.scopeFilter.replace("{count}", count.toLocaleString("tr-TR"))
    : labels.scopeSelection.replace("{count}", count.toLocaleString("tr-TR"));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label={labels.close}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[2px]"
      />

      <aside className="relative flex h-full w-full max-w-md flex-col overflow-hidden border-l border-zinc-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-zinc-900">{labels.title}</h2>
            <p className="mt-0.5 text-sm text-zinc-500">{scopeText}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.close}
            className="-mr-1 shrink-0 rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {result ? (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                result.kind === "ok"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-rose-200 bg-rose-50 text-rose-900"
              }`}
            >
              {result.text}
            </div>
          ) : null}

          {action === null ? (
            <ActionList labels={labels} onPick={setAction} />
          ) : (
            <ActionForm
              action={action}
              labels={labels}
              options={options}
              payload={payload}
              setPayload={setPayload}
            />
          )}
        </div>

        {action !== null ? (
          <footer className="border-t border-zinc-200 px-5 py-4">
            {isDestructive ? (
              <div className="mb-3">
                <p className="mb-2 text-xs text-amber-800">
                  {action === "soft_delete" ? labels.reversible : labels.irreversible}
                </p>
                <label className="block text-xs font-semibold text-zinc-600">
                  {labels.confirmTypeCount.replace("{count}", String(count))}
                </label>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  inputMode="numeric"
                  placeholder={labels.confirmPlaceholder}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/25"
                />
              </div>
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={reset}
                disabled={pending}
                className="min-h-[44px] flex-1 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                {labels.back}
              </button>
              <button
                type="button"
                onClick={execute}
                disabled={pending || !confirmOk}
                className={`min-h-[44px] flex-1 rounded-xl px-4 text-sm font-bold text-white transition disabled:opacity-40 ${
                  isDestructive ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {pending ? labels.running : labels.run}
              </button>
            </div>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}

function ActionList({
  labels,
  onPick,
}: {
  labels: BulkDrawerLabels;
  onPick: (a: DrawerAction) => void;
}) {
  return (
    <div className="space-y-5">
      {GROUPS.map((group) => (
        <section key={group.key}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-400">
            {labels.groups[group.key]}
          </h3>
          <div className="space-y-1.5">
            {group.actions.map((a) => {
              const meta = labels.actions[a];
              const danger = group.key === "danger";
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => onPick(a)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    danger
                      ? "border-rose-200 bg-rose-50/50 hover:bg-rose-50"
                      : "border-zinc-200 bg-white hover:bg-zinc-50"
                  }`}
                >
                  <span className={`block text-sm font-semibold ${danger ? "text-rose-800" : "text-zinc-900"}`}>
                    {meta?.label ?? a}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">{meta?.description ?? ""}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function ActionForm({
  action,
  labels,
  options,
  payload,
  setPayload,
}: {
  action: DrawerAction;
  labels: BulkDrawerLabels;
  options: BulkDrawerOptions;
  payload: BulkPayload;
  setPayload: (updater: (prev: BulkPayload) => BulkPayload) => void;
}) {
  const meta = labels.actions[action];
  const set = <K extends keyof BulkPayload>(key: K, value: BulkPayload[K]) =>
    setPayload((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-zinc-50 px-4 py-3">
        <p className="text-sm font-semibold text-zinc-900">{meta?.label ?? action}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{meta?.description ?? ""}</p>
      </div>

      {action === "set_status" ? (
        <Field label={labels.fields.status}>
          <Select value={payload.status ?? ""} onChange={(v) => set("status", v)} placeholder={labels.fields.choose}>
            {SETTABLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {options.statusLabels[s] ?? s}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      {action === "review" ? (
        <Field label={labels.fields.decision}>
          <Select
            value={payload.decision ?? ""}
            onChange={(v) => set("decision", v === "approve" || v === "reject" ? v : undefined)}
            placeholder={labels.fields.choose}
          >
            <option value="approve">{labels.fields.approve}</option>
            <option value="reject">{labels.fields.reject}</option>
          </Select>
        </Field>
      ) : null}

      {action === "assign_agent" ? (
        <Field label={labels.fields.agent}>
          <Select value={payload.agentId ?? ""} onChange={(v) => set("agentId", v)} placeholder={labels.fields.choose}>
            {options.agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      {action === "set_featured" ? (
        <Field label={labels.actions.set_featured?.label ?? ""}>
          <Select
            value={payload.featured === undefined ? "" : payload.featured ? "on" : "off"}
            onChange={(v) => set("featured", v === "on")}
            placeholder={labels.fields.choose}
          >
            <option value="on">{labels.fields.featuredOn}</option>
            <option value="off">{labels.fields.featuredOff}</option>
          </Select>
        </Field>
      ) : null}

      {action === "update_price" ? (
        <>
          <Field label={labels.fields.priceMode}>
            <Select
              value={payload.priceMode ?? ""}
              onChange={(v) => set("priceMode", v === "percent" || v === "amount" ? v : undefined)}
              placeholder={labels.fields.choose}
            >
              <option value="percent">{labels.fields.pricePercent}</option>
              <option value="amount">{labels.fields.priceAmount}</option>
            </Select>
          </Field>
          <Field label={labels.fields.priceValue} hint={labels.fields.priceHint}>
            <input
              type="number"
              step="any"
              value={payload.priceValue ?? ""}
              onChange={(e) => set("priceValue", e.target.value === "" ? undefined : Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label={labels.fields.priceRounding}>
            <input
              type="number"
              min={0}
              step="1"
              value={payload.priceRounding ?? ""}
              onChange={(e) => set("priceRounding", e.target.value === "" ? undefined : Number(e.target.value))}
              className={inputClass}
            />
          </Field>
        </>
      ) : null}

      {action === "set_feed_flags" ? (
        <>
          <Field label={labels.fields.export101}>
            <TriState
              value={payload.export101}
              onChange={(v) => set("export101", v)}
              labels={labels.fields}
            />
          </Field>
          <Field label={labels.fields.exportHangiev}>
            <TriState
              value={payload.exportHangiev}
              onChange={(v) => set("exportHangiev", v)}
              labels={labels.fields}
            />
          </Field>
        </>
      ) : null}

      {action === "set_taxonomy" ? (
        <>
          <p className="text-xs text-zinc-500">{labels.fields.taxonomyHint}</p>
          <Field label={labels.fields.kind}>
            <Select value={payload.kind ?? ""} onChange={(v) => set("kind", v)} placeholder={labels.fields.unchanged}>
              {options.kinds.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={labels.fields.propertyType}>
            <Select
              value={payload.propertyType ?? ""}
              onChange={(v) => set("propertyType", v)}
              placeholder={labels.fields.unchanged}
            >
              {options.propertyTypes.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={labels.fields.city}>
            <Select value={payload.city ?? ""} onChange={(v) => set("city", v)} placeholder={labels.fields.unchanged}>
              {options.cities.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={labels.fields.region}>
            <input
              value={payload.region ?? ""}
              onChange={(e) => set("region", e.target.value)}
              className={inputClass}
            />
          </Field>
        </>
      ) : null}

      {action === "csv" ? <p className="text-xs text-zinc-500">{labels.fields.csvHint}</p> : null}
    </div>
  );
}

const inputClass =
  "w-full min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-zinc-600">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-zinc-400">{hint}</span> : null}
    </label>
  );
}

function Select({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      <option value="">{placeholder}</option>
      {children}
    </select>
  );
}

/** Aç / kapat / dokunma — feed bayrağı yalnızca seçilirse yazılır. */
function TriState({
  value,
  onChange,
  labels,
}: {
  value: boolean | undefined;
  onChange: (v: boolean | undefined) => void;
  labels: BulkDrawerLabels["fields"];
}) {
  const current = value === undefined ? "" : value ? "on" : "off";
  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value === "on")}
      className={inputClass}
    >
      <option value="">{labels.unchanged}</option>
      <option value="on">{labels.on}</option>
      <option value="off">{labels.off}</option>
    </select>
  );
}

function downloadCsv(csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ilanlar-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
