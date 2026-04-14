"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { defaultMegaMenu, type MenuColumn, type MenuLink, type MenuTopItem } from "@/lib/default-menu";
import { menuTopItemsSchema } from "@/lib/menu-schema";

type SaveAction = (json: string) => Promise<{ ok: boolean; message?: string }>;

type Issue = {
  path: string;
  message: string;
};

const criticalIds = ["satilik", "projeler", "kiralik", "daha-fazla"] as const;

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function parseInitialMenu(initial: string): MenuTopItem[] {
  try {
    const parsed = JSON.parse(initial) as unknown;
    const validated = menuTopItemsSchema.safeParse(parsed);
    if (validated.success) return validated.data;
  } catch {
    // fallback below
  }
  return deepClone(defaultMegaMenu);
}

function prettyJson(menu: MenuTopItem[]) {
  return JSON.stringify(menu, null, 2);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "menu-item";
}

function uniqueId(base: string, existing: string[]) {
  const clean = slugify(base);
  let candidate = clean;
  let counter = 2;
  while (existing.includes(candidate)) {
    candidate = `${clean}-${counter}`;
    counter += 1;
  }
  return candidate;
}

function createLink(label = "Yeni link", href = "/ilanlar"): MenuLink {
  return { label, href };
}

function createColumn(title = "Yeni kolon"): MenuColumn {
  return { title, links: [createLink()] };
}

function createMenuItem(existingIds: string[], label = "Yeni menü", columnsCount = 1): MenuTopItem {
  const id = uniqueId(label, existingIds);
  return {
    id,
    label,
    columns: Array.from({ length: Math.max(1, columnsCount) }, () => createColumn()),
  };
}

function moveInArray<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function MenuPreview({ menu, activeId, onSelect }: { menu: MenuTopItem[]; activeId: string; onSelect: (id: string) => void }) {
  const active = menu.find((item) => item.id === activeId) ?? menu[0];

  return (
    <div className="rounded-2xl border border-(--ghost-outline) bg-surface-lowest shadow-(--shadow-ambient)">
      <div className="border-b border-(--ghost-outline) px-4 py-3">
        <p className="label-sm text-(--on-surface)/45">Canlı önizleme</p>
        <p className="mt-1 text-sm text-(--on-surface)/55">Masaüstü mega menü yapısı</p>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap gap-2 border-b border-(--ghost-outline) pb-3">
          {menu.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                item.id === active?.id
                  ? "bg-(--secondary) text-white"
                  : "bg-surface-low text-(--primary)/70 hover:bg-(--surface-high)"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {active ? (
          <div className="mt-4 rounded-2xl bg-surface-low/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--on-surface)/45">{active.id}</p>
                <h3 className="mt-1 font-headline text-lg font-bold text-(--primary)">{active.label}</h3>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-(--secondary)">
                {active.columns.length} kolon
              </span>
            </div>
            <div className="mt-4 grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(active.columns.length, 5)}, minmax(0, 1fr))` }}>
              {active.columns.map((column) => (
                <div key={column.title} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-(--ghost-outline)">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-(--on-surface)/45">{column.title}</p>
                  <div className="space-y-2">
                    {column.links.map((link) => (
                      <a key={`${link.label}-${link.href}`} href={link.href} className="block rounded-lg px-2 py-1.5 text-sm text-(--primary)/80 hover:bg-surface-low hover:text-(--secondary)">
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border border-dashed border-(--ghost-outline) bg-(--surface) p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--on-surface)/45">Mobil önizleme</p>
          <div className="mt-3 space-y-2">
            {menu.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                  item.id === active?.id ? "bg-(--secondary) text-white" : "bg-surface-lowest text-(--primary)/75 hover:bg-surface-low"
                }`}
              >
                <span>{item.label}</span>
                <span className="text-xs opacity-75">{item.columns.reduce((count, col) => count + col.links.length, 0)} link</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function IssueList({ issues }: { issues: Issue[] }) {
  if (!issues.length) return null;
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="flex items-start gap-3">
        <AdminIcon name="warning" size={18} className="mt-0.5 text-amber-700" />
        <div className="space-y-1">
          <p className="font-bold">Kontrol gerekli</p>
          <ul className="list-disc space-y-1 pl-5 text-amber-800">
            {issues.map((issue) => (
              <li key={`${issue.path}-${issue.message}`}>{issue.path ? `${issue.path}: ` : ""}{issue.message}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SpecialIdBadge({ id }: { id: string }) {
  if (!criticalIds.includes(id as (typeof criticalIds)[number])) return null;
  return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-800">Sistem</span>;
}

function MenuLinkRow({
  link,
  linkIndex,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  onDuplicate,
}: {
  link: MenuLink;
  linkIndex: number;
  onChange: (next: MenuLink) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  return (
    <div className="grid gap-2 rounded-xl border border-(--ghost-outline) bg-surface-lowest p-3 lg:grid-cols-[1fr_1.4fr_auto]">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-surface-low px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-(--on-surface)/45">#{linkIndex + 1}</span>
        <input
          value={link.label}
          onChange={(e) => onChange({ ...link, label: e.target.value })}
          className="w-full rounded-lg border border-(--ghost-outline) bg-white px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20"
          placeholder="Link etiketi"
        />
      </div>
      <input
        value={link.href}
        onChange={(e) => onChange({ ...link, href: e.target.value })}
        className="rounded-lg border border-(--ghost-outline) bg-white px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20"
        placeholder="/ilanlar?..."
      />
      <div className="flex items-center gap-1 justify-end">
        <button type="button" onClick={onMoveUp} className="rounded-lg border border-(--ghost-outline) p-2 text-(--primary)/70 hover:bg-surface-low" title="Yukarı taşı"><AdminIcon name="arrow_back" size={16} /></button>
        <button type="button" onClick={onMoveDown} className="rounded-lg border border-(--ghost-outline) p-2 text-(--primary)/70 hover:bg-surface-low" title="Aşağı taşı"><AdminIcon name="arrow_forward" size={16} /></button>
        <button type="button" onClick={onDuplicate} className="rounded-lg border border-(--ghost-outline) p-2 text-(--primary)/70 hover:bg-surface-low" title="Kopyala"><AdminIcon name="add" size={16} /></button>
        <button type="button" onClick={onDelete} className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50" title="Sil"><AdminIcon name="trash" size={16} /></button>
      </div>
    </div>
  );
}

function MenuColumnCard({
  column,
  columnIndex,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  onDuplicate,
  onAddLink,
  onLinkChange,
  onLinkMoveUp,
  onLinkMoveDown,
  onLinkDelete,
  onLinkDuplicate,
}: {
  column: MenuColumn;
  columnIndex: number;
  onChange: (next: MenuColumn) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddLink: () => void;
  onLinkChange: (index: number, next: MenuLink) => void;
  onLinkMoveUp: (index: number) => void;
  onLinkMoveDown: (index: number) => void;
  onLinkDelete: (index: number) => void;
  onLinkDuplicate: (index: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-(--ghost-outline) bg-surface-lowest p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-surface-low px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-(--on-surface)/45">Kolon {columnIndex + 1}</span>
          <input
            value={column.title}
            onChange={(e) => onChange({ ...column, title: e.target.value })}
            className="min-w-55 rounded-lg border border-(--ghost-outline) bg-white px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20"
            placeholder="Kolon başlığı"
          />
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onMoveUp} className="rounded-lg border border-(--ghost-outline) p-2 text-(--primary)/70 hover:bg-surface-low" title="Kolonu yukarı taşı"><AdminIcon name="arrow_back" size={16} /></button>
          <button type="button" onClick={onMoveDown} className="rounded-lg border border-(--ghost-outline) p-2 text-(--primary)/70 hover:bg-surface-low" title="Kolonu aşağı taşı"><AdminIcon name="arrow_forward" size={16} /></button>
          <button type="button" onClick={onDuplicate} className="rounded-lg border border-(--ghost-outline) p-2 text-(--primary)/70 hover:bg-surface-low" title="Kolonu kopyala"><AdminIcon name="add" size={16} /></button>
          <button type="button" onClick={onDelete} className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50" title="Kolonu sil"><AdminIcon name="trash" size={16} /></button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {column.links.map((link, linkIndex) => (
          <MenuLinkRow
            key={`${column.title}-${link.label}-${linkIndex}`}
            link={link}
            linkIndex={linkIndex}
            onChange={(next) => onLinkChange(linkIndex, next)}
            onMoveUp={() => onLinkMoveUp(linkIndex)}
            onMoveDown={() => onLinkMoveDown(linkIndex)}
            onDelete={() => onLinkDelete(linkIndex)}
            onDuplicate={() => onLinkDuplicate(linkIndex)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onAddLink}
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed border-(--ghost-outline) px-3 py-2 text-sm font-semibold text-(--secondary) hover:bg-surface-low"
      >
        <AdminIcon name="add" size={16} />
        Link ekle
      </button>
    </div>
  );
}

function MenuItemCard({
  item,
  itemIndex,
  expanded,
  onToggle,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  onDuplicate,
  onAddColumn,
  onColumnChange,
  onColumnMoveUp,
  onColumnMoveDown,
  onColumnDelete,
  onColumnDuplicate,
  onAddLink,
  onLinkChange,
  onLinkMoveUp,
  onLinkMoveDown,
  onLinkDelete,
  onLinkDuplicate,
}: {
  item: MenuTopItem;
  itemIndex: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (next: MenuTopItem) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddColumn: () => void;
  onColumnChange: (index: number, next: MenuColumn) => void;
  onColumnMoveUp: (index: number) => void;
  onColumnMoveDown: (index: number) => void;
  onColumnDelete: (index: number) => void;
  onColumnDuplicate: (index: number) => void;
  onAddLink: (columnIndex: number) => void;
  onLinkChange: (columnIndex: number, linkIndex: number, next: MenuLink) => void;
  onLinkMoveUp: (columnIndex: number, linkIndex: number) => void;
  onLinkMoveDown: (columnIndex: number, linkIndex: number) => void;
  onLinkDelete: (columnIndex: number, linkIndex: number) => void;
  onLinkDuplicate: (columnIndex: number, linkIndex: number) => void;
}) {
  const isCritical = criticalIds.includes(item.id as (typeof criticalIds)[number]);
  return (
    <section className="rounded-2xl border border-(--ghost-outline) bg-surface-lowest shadow-(--shadow-ambient)">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
        className="flex w-full cursor-pointer items-start justify-between gap-4 border-b border-(--ghost-outline) px-4 py-4 text-left"
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-(--secondary) px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">{itemIndex + 1}</span>
            <SpecialIdBadge id={item.id} />
            {isCritical ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-800">Kritik ID</span> : null}
          </div>
          <h3 className="font-headline text-lg font-bold text-(--primary)">{item.label || "Başlıksız menü"}</h3>
          <p className="text-sm text-(--on-surface)/55">
            {item.columns.length} kolon, {item.columns.reduce((total, column) => total + column.links.length, 0)} link
          </p>
        </div>
        <div className="flex items-center gap-1 pt-1">
          <button type="button" onClick={(event) => { event.stopPropagation(); onMoveUp(); }} className="rounded-lg border border-(--ghost-outline) p-2 text-(--primary)/70 hover:bg-surface-low" title="Yukarı taşı"><AdminIcon name="arrow_back" size={16} /></button>
          <button type="button" onClick={(event) => { event.stopPropagation(); onMoveDown(); }} className="rounded-lg border border-(--ghost-outline) p-2 text-(--primary)/70 hover:bg-surface-low" title="Aşağı taşı"><AdminIcon name="arrow_forward" size={16} /></button>
          <button type="button" onClick={(event) => { event.stopPropagation(); onDuplicate(); }} className="rounded-lg border border-(--ghost-outline) p-2 text-(--primary)/70 hover:bg-surface-low" title="Kopyala"><AdminIcon name="add" size={16} /></button>
          <button type="button" onClick={(event) => { event.stopPropagation(); onDelete(); }} className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50" title="Sil"><AdminIcon name="trash" size={16} /></button>
        </div>
      </div>

      {expanded ? (
        <div className="space-y-6 p-4">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
            <label className="space-y-2 text-sm font-medium text-(--primary)/80">
              <span>Üst menü etiketi</span>
              <input
                value={item.label}
                onChange={(e) => onChange({ ...item, label: e.target.value })}
                className="w-full rounded-xl border border-(--ghost-outline) bg-white px-3 py-2.5 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-(--primary)/80">
              <span>Üst menü id</span>
              <input
                value={item.id}
                onChange={(e) => onChange({ ...item, id: e.target.value })}
                className="w-full rounded-xl border border-(--ghost-outline) bg-white px-3 py-2.5 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20"
              />
            </label>
          </div>

          {isCritical ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Bu ID site başlığında özel davranışa sahip. Silmek veya yeniden adlandırmak üst menüyü etkileyebilir.
            </div>
          ) : null}

          <div className="space-y-4">
            {item.columns.map((column, columnIndex) => (
              <MenuColumnCard
                key={`${item.id}-${column.title}-${columnIndex}`}
                column={column}
                columnIndex={columnIndex}
                onChange={(next) => onColumnChange(columnIndex, next)}
                onMoveUp={() => onColumnMoveUp(columnIndex)}
                onMoveDown={() => onColumnMoveDown(columnIndex)}
                onDelete={() => onColumnDelete(columnIndex)}
                onDuplicate={() => onColumnDuplicate(columnIndex)}
                onAddLink={() => onAddLink(columnIndex)}
                onLinkChange={(linkIndex, next) => onLinkChange(columnIndex, linkIndex, next)}
                onLinkMoveUp={(linkIndex) => onLinkMoveUp(columnIndex, linkIndex)}
                onLinkMoveDown={(linkIndex) => onLinkMoveDown(columnIndex, linkIndex)}
                onLinkDelete={(linkIndex) => onLinkDelete(columnIndex, linkIndex)}
                onLinkDuplicate={(linkIndex) => onLinkDuplicate(columnIndex, linkIndex)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={onAddColumn}
            className="inline-flex items-center gap-2 rounded-xl border border-dashed border-(--ghost-outline) px-4 py-2.5 text-sm font-semibold text-(--secondary) hover:bg-surface-low"
          >
            <AdminIcon name="add" size={16} />
            Kolon ekle
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function MenuEditor({
  initial,
  saveAction,
}: {
  initial: string;
  saveAction: SaveAction;
}) {
  const [menu, setMenu] = useState<MenuTopItem[]>(() => parseInitialMenu(initial));
  const [selectedItemId, setSelectedItemId] = useState<string>(() => parseInitialMenu(initial)[0]?.id ?? "");
  const [draftJson, setDraftJson] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!selectedItemId && menu[0]) setSelectedItemId(menu[0].id);
  }, [menu, selectedItemId]);

  useEffect(() => {
    if (selectedItemId && !menu.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(menu[0]?.id ?? "");
    }
  }, [menu, selectedItemId]);

  const jsonText = useMemo(() => prettyJson(menu), [menu]);
  const validation = useMemo(() => menuTopItemsSchema.safeParse(menu), [menu]);
  const issues = useMemo<Issue[]>(() => {
    if (validation.success) return [];
    return validation.error.issues.map((issue) => ({
      path: issue.path.length ? issue.path.join(".") : "menü",
      message: issue.message,
    }));
  }, [validation]);
  const missingCriticalIds = criticalIds.filter((id) => !menu.some((item) => item.id === id));

  function updateMenu(next: MenuTopItem[]) {
    setMenu(next);
  }

  function updateItem(index: number, updater: (item: MenuTopItem) => MenuTopItem) {
    updateMenu(menu.map((item, itemIndex) => (itemIndex === index ? updater(item) : item)));
  }

  function updateColumn(itemIndex: number, columnIndex: number, updater: (column: MenuColumn) => MenuColumn) {
    updateItem(itemIndex, (item) => ({
      ...item,
      columns: item.columns.map((column, index) => (index === columnIndex ? updater(column) : column)),
    }));
  }

  function updateLink(itemIndex: number, columnIndex: number, linkIndex: number, updater: (link: MenuLink) => MenuLink) {
    updateColumn(itemIndex, columnIndex, (column) => ({
      ...column,
      links: column.links.map((link, index) => (index === linkIndex ? updater(link) : link)),
    }));
  }

  function addItem() {
    const next = createMenuItem(menu.map((item) => item.id), "Yeni menü");
    updateMenu([...menu, next]);
    setSelectedItemId(next.id);
  }

  function duplicateItem(index: number) {
    const item = deepClone(menu[index]);
    const existingIds = menu.map((current) => current.id);
    item.id = uniqueId(`${item.label} kopya`, existingIds);
    item.label = `${item.label} kopya`;
    updateMenu([...menu.slice(0, index + 1), item, ...menu.slice(index + 1)]);
    setSelectedItemId(item.id);
  }

  function deleteItem(index: number) {
    const removed = menu[index];
    const next = menu.filter((_, itemIndex) => itemIndex !== index);
    updateMenu(next.length ? next : [createMenuItem([], "Yeni menü")]);
    if (removed?.id === selectedItemId) setSelectedItemId(next[0]?.id ?? "");
  }

  function addColumn(itemIndex: number) {
    updateItem(itemIndex, (item) => ({
      ...item,
      columns: [...item.columns, createColumn()],
    }));
  }

  function duplicateColumn(itemIndex: number, columnIndex: number) {
    updateItem(itemIndex, (item) => {
      const column = deepClone(item.columns[columnIndex]);
      return {
        ...item,
        columns: [...item.columns.slice(0, columnIndex + 1), column, ...item.columns.slice(columnIndex + 1)],
      };
    });
  }

  function deleteColumn(itemIndex: number, columnIndex: number) {
    updateItem(itemIndex, (item) => {
      const next = item.columns.filter((_, index) => index !== columnIndex);
      return { ...item, columns: next.length ? next : [createColumn()] };
    });
  }

  function addLink(itemIndex: number, columnIndex: number) {
    updateColumn(itemIndex, columnIndex, (column) => ({
      ...column,
      links: [...column.links, createLink()],
    }));
  }

  function duplicateLink(itemIndex: number, columnIndex: number, linkIndex: number) {
    updateColumn(itemIndex, columnIndex, (column) => {
      const link = deepClone(column.links[linkIndex]);
      return {
        ...column,
        links: [...column.links.slice(0, linkIndex + 1), link, ...column.links.slice(linkIndex + 1)],
      };
    });
  }

  function deleteLink(itemIndex: number, columnIndex: number, linkIndex: number) {
    updateColumn(itemIndex, columnIndex, (column) => {
      const next = column.links.filter((_, index) => index !== linkIndex);
      return { ...column, links: next.length ? next : [createLink()] };
    });
  }

  function importJsonText() {
    try {
      const parsed = JSON.parse(draftJson) as unknown;
      const validated = menuTopItemsSchema.safeParse(parsed);
      if (!validated.success) {
        const first = validated.error.issues[0];
        setMsg(`${first.path.join(".") || "menü"}: ${first.message}`);
        return;
      }
      setMenu(validated.data);
      setSelectedItemId(validated.data[0]?.id ?? "");
      setMsg("JSON içe aktarıldı.");
    } catch {
      setMsg("Geçersiz JSON.");
    }
  }

  function resetToDefault() {
    const next = deepClone(defaultMegaMenu);
    setMenu(next);
    setSelectedItemId(next[0]?.id ?? "");
    setMsg("Varsayılan menüye döndürüldü.");
  }

  function syncRaw() {
    setDraftJson(jsonText);
    setMsg("JSON önizlemesi güncellendi.");
  }

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.8fr)]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-(--ghost-outline) bg-surface-lowest p-4 shadow-(--shadow-ambient)">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="label-sm text-(--secondary)">Menü oluşturucu</p>
              <h2 className="mt-1 font-headline text-2xl font-extrabold text-(--primary)">Yapılandırılmış düzenleme</h2>
              <p className="mt-1 text-sm text-(--on-surface)/55">Üst öğe, kolon ve linkleri form üzerinden düzenleyin.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-2 rounded-xl bg-(--secondary) px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-(--secondary)/25 transition hover:bg-brand-hover"
              >
                <AdminIcon name="add" size={16} />
                Menü ekle
              </button>
              <button
                type="button"
                onClick={resetToDefault}
                className="inline-flex items-center gap-2 rounded-xl border border-(--ghost-outline) bg-white px-4 py-2.5 text-sm font-semibold text-(--primary) transition hover:bg-surface-low"
              >
                Varsayılana dön
              </button>
              <button
                type="button"
                onClick={syncRaw}
                className="inline-flex items-center gap-2 rounded-xl border border-(--ghost-outline) bg-white px-4 py-2.5 text-sm font-semibold text-(--primary) transition hover:bg-surface-low"
              >
                JSON önizle
              </button>
            </div>
          </div>

          {missingCriticalIds.length ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Kritik menüler eksik: {missingCriticalIds.join(", ")}. Header’da görünmezler.
            </div>
          ) : null}

          <IssueList issues={issues} />

          {msg ? <p className="mt-4 text-sm font-medium text-(--on-surface)/65">{msg}</p> : null}
        </div>

        <div className="space-y-4">
          {menu.map((item, index) => (
            <MenuItemCard
              key={item.id + index}
              item={item}
              itemIndex={index}
              expanded={selectedItemId === item.id}
              onToggle={() => setSelectedItemId((current) => (current === item.id ? "" : item.id))}
              onChange={(next) => {
                updateItem(index, () => next);
                if (selectedItemId !== next.id) setSelectedItemId(next.id);
              }}
              onMoveUp={() => index > 0 && updateMenu(moveInArray(menu, index, index - 1))}
              onMoveDown={() => index < menu.length - 1 && updateMenu(moveInArray(menu, index, index + 1))}
              onDelete={() => deleteItem(index)}
              onDuplicate={() => duplicateItem(index)}
              onAddColumn={() => addColumn(index)}
              onColumnChange={(columnIndex, next) => updateColumn(index, columnIndex, () => next)}
              onColumnMoveUp={(columnIndex) => {
                if (columnIndex === 0) return;
                updateItem(index, (current) => ({
                  ...current,
                  columns: moveInArray(current.columns, columnIndex, columnIndex - 1),
                }));
              }}
              onColumnMoveDown={(columnIndex) => {
                if (columnIndex >= item.columns.length - 1) return;
                updateItem(index, (current) => ({
                  ...current,
                  columns: moveInArray(current.columns, columnIndex, columnIndex + 1),
                }));
              }}
              onColumnDelete={(columnIndex) => deleteColumn(index, columnIndex)}
              onColumnDuplicate={(columnIndex) => duplicateColumn(index, columnIndex)}
              onAddLink={(columnIndex) => addLink(index, columnIndex)}
              onLinkChange={(columnIndex, linkIndex, next) => updateLink(index, columnIndex, linkIndex, () => next)}
              onLinkMoveUp={(columnIndex, linkIndex) => {
                if (linkIndex === 0) return;
                updateColumn(index, columnIndex, (column) => ({
                  ...column,
                  links: moveInArray(column.links, linkIndex, linkIndex - 1),
                }));
              }}
              onLinkMoveDown={(columnIndex, linkIndex) => {
                const column = item.columns[columnIndex];
                if (linkIndex >= column.links.length - 1) return;
                updateColumn(index, columnIndex, (current) => ({
                  ...current,
                  links: moveInArray(current.links, linkIndex, linkIndex + 1),
                }));
              }}
              onLinkDelete={(columnIndex, linkIndex) => deleteLink(index, columnIndex, linkIndex)}
              onLinkDuplicate={(columnIndex, linkIndex) => duplicateLink(index, columnIndex, linkIndex)}
            />
          ))}

          <details className="rounded-2xl border border-(--ghost-outline) bg-surface-lowest p-4 shadow-(--shadow-ambient)">
            <summary className="cursor-pointer list-none font-semibold text-(--primary)">
              Gelişmiş: JSON içe aktar / dışa aktar
            </summary>
            <div className="mt-4 grid gap-4">
              <textarea
                className="min-h-55 w-full rounded-2xl border border-(--ghost-outline) bg-(--surface) p-4 font-mono text-xs outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20"
                value={draftJson}
                onChange={(e) => setDraftJson(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={importJsonText}
                  className="rounded-xl bg-(--primary) px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                >
                  JSON'u içe aktar
                </button>
                <button
                  type="button"
                  onClick={() => setDraftJson(jsonText)}
                  className="rounded-xl border border-(--ghost-outline) bg-white px-4 py-2.5 text-sm font-semibold text-(--primary) transition hover:bg-surface-low"
                >
                  JSON'u senkronla
                </button>
              </div>
              <pre className="max-h-72 overflow-auto rounded-2xl bg-(--primary) px-4 py-3 text-[11px] leading-relaxed text-white/85">{jsonText}</pre>
            </div>
          </details>
        </div>
      </div>

      <div className="space-y-4">
        <MenuPreview menu={menu} activeId={selectedItemId} onSelect={setSelectedItemId} />

        <div className="rounded-2xl border border-(--ghost-outline) bg-surface-lowest p-4 shadow-(--shadow-ambient)">
          <p className="label-sm text-(--secondary)">Kaydet</p>
          <p className="mt-1 text-sm text-(--on-surface)/55">Değişiklikleri doğrulayın, ardından kaydedin.</p>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const payload = jsonText;
                const response = await saveAction(payload);
                setMsg(response.ok ? "Menü güncellendi." : response.message ?? "Hata");
              });
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-(--secondary) px-5 py-3 text-sm font-bold text-white shadow-md shadow-(--secondary)/25 transition hover:bg-brand-hover disabled:opacity-50"
          >
            <AdminIcon name="check_circle" size={16} />
            {pending ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}