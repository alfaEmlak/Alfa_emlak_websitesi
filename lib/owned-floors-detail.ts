/**
 * Konut / ticari / proje — mülkün kaç kata yayıldığı (tek / çok kat + dubleks vb.).
 * detailFields içinde tutulur.
 */

type OwnedFloorsDetailEntry = { value: string; visible: boolean };

export type OwnedFloorsScope = "single" | "multiple";
export type OwnedFloorsLayout = "duplex" | "triplex" | "whole_building" | "custom";

export const OWNED_FLOORS_SCOPE_KEYS = {
  single: "single",
  multiple: "multiple",
} as const;

export const OWNED_FLOORS_LAYOUT_KEYS = {
  duplex: "duplex",
  triplex: "triplex",
  whole_building: "whole_building",
  custom: "custom",
} as const;

const DETAIL_SCOPE = "ownedFloorsScope";
const DETAIL_LAYOUT = "ownedFloorsLayout";
const DETAIL_FLOOR_COUNT = "ownedFloorsFloorCount";

function parseDetailMap(raw: string | null | undefined): Record<string, OwnedFloorsDetailEntry> {
  if (!raw?.trim()) return {};
  try {
    const o = JSON.parse(raw) as Record<string, OwnedFloorsDetailEntry>;
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

function entryMachine(value: string): OwnedFloorsDetailEntry {
  return { value, visible: true };
}

export function parseOwnedFloorsFromDetailFields(detailFields: unknown): {
  ownedFloorsScope: OwnedFloorsScope;
  ownedFloorsLayout: OwnedFloorsLayout | "";
  ownedFloorsFloorCount: string;
} {
  let map: Record<string, OwnedFloorsDetailEntry> = {};
  if (typeof detailFields === "string" && detailFields.trim()) {
    map = parseDetailMap(detailFields);
  } else if (detailFields && typeof detailFields === "object" && !Array.isArray(detailFields)) {
    map = detailFields as Record<string, OwnedFloorsDetailEntry>;
  }
  const scopeRaw = String(map[DETAIL_SCOPE]?.value ?? "").trim();
  const layoutRaw = String(map[DETAIL_LAYOUT]?.value ?? "").trim();
  const countRaw = String(map[DETAIL_FLOOR_COUNT]?.value ?? "").trim();
  const scope: OwnedFloorsScope = scopeRaw === OWNED_FLOORS_SCOPE_KEYS.multiple ? "multiple" : "single";
  const layout: OwnedFloorsLayout | "" =
    layoutRaw === OWNED_FLOORS_LAYOUT_KEYS.duplex ||
    layoutRaw === OWNED_FLOORS_LAYOUT_KEYS.triplex ||
    layoutRaw === OWNED_FLOORS_LAYOUT_KEYS.whole_building ||
    layoutRaw === OWNED_FLOORS_LAYOUT_KEYS.custom
      ? layoutRaw
      : "";
  return {
    ownedFloorsScope: scope,
    ownedFloorsLayout: layout,
    ownedFloorsFloorCount: /^\d+$/.test(countRaw) ? countRaw : "",
  };
}

/** Arsa dışındaki ilanlarda (konut, ticari, proje) kullanılır. */
export function mergeOwnedFloorsDetailFields(
  existingDetailFieldsJson: string,
  applicable: boolean,
  scope: OwnedFloorsScope,
  layout: OwnedFloorsLayout | "",
  customFloorCount: string,
): string {
  let obj: Record<string, unknown> = {};
  try {
    if (existingDetailFieldsJson?.trim()) {
      obj = JSON.parse(existingDetailFieldsJson) as Record<string, unknown>;
    }
  } catch {
    obj = {};
  }

  delete obj[DETAIL_SCOPE];
  delete obj[DETAIL_LAYOUT];
  delete obj[DETAIL_FLOOR_COUNT];

  if (!applicable) {
    return JSON.stringify(obj);
  }

  obj[DETAIL_SCOPE] = entryMachine(scope);
  if (scope === "multiple" && layout) {
    obj[DETAIL_LAYOUT] = entryMachine(layout);
    if (layout === OWNED_FLOORS_LAYOUT_KEYS.custom) {
      const n = String(customFloorCount ?? "").trim();
      if (/^\d+$/.test(n)) {
        const num = Number.parseInt(n, 10);
        if (num >= 2 && num <= 99) {
          obj[DETAIL_FLOOR_COUNT] = entryMachine(String(num));
        }
      }
    }
  }

  return JSON.stringify(obj);
}
