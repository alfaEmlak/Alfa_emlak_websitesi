/**
 * Mal sahibi iletişim bilgileri — yalnızca panel (admin / ilanı oluşturan danışman).
 * Public ilan sayfası ve dışa aktarımlarda kullanılmaz.
 */

export const OWNER_CONTACT_PRIVATE_KEY = "ownerContactPrivate";

export type DetailBuildingAgePreset = "" | "zero" | "project";

export type OwnerContactPrivate = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string;
  /** Koçan / belge fotoğrafları — yalnızca panel */
  documentUrls: string[];
};

export const EMPTY_OWNER_CONTACT: OwnerContactPrivate = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  notes: "",
  documentUrls: [],
};

export function parseOwnerContactPrivate(detailFields: unknown): OwnerContactPrivate {
  try {
    let o: Record<string, unknown>;
    if (typeof detailFields === "string" && detailFields.trim()) {
      o = JSON.parse(detailFields) as Record<string, unknown>;
    } else if (detailFields && typeof detailFields === "object" && !Array.isArray(detailFields)) {
      o = detailFields as Record<string, unknown>;
    } else {
      return { ...EMPTY_OWNER_CONTACT };
    }
    const p = o[OWNER_CONTACT_PRIVATE_KEY];
    if (p && typeof p === "object" && !Array.isArray(p)) {
      const r = p as Record<string, unknown>;
      const rawDocs = r.documentUrls;
      const documentUrls = Array.isArray(rawDocs)
        ? rawDocs
            .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
            .map((x) => x.trim())
        : [];
      return {
        firstName: String(r.firstName ?? ""),
        lastName: String(r.lastName ?? ""),
        phone: String(r.phone ?? ""),
        email: String(r.email ?? ""),
        notes: String(r.notes ?? ""),
        documentUrls,
      };
    }
  } catch {
    /* ignore */
  }
  return { ...EMPTY_OWNER_CONTACT };
}

export function mergeDetailFieldsWithOwnerAndPreset(
  existingDetailFields: unknown,
  buildingAgePreset: DetailBuildingAgePreset,
  owner: OwnerContactPrivate,
): string {
  let obj: Record<string, unknown> = {};
  try {
    if (typeof existingDetailFields === "string" && existingDetailFields.trim()) {
      obj = JSON.parse(existingDetailFields) as Record<string, unknown>;
    } else if (
      existingDetailFields &&
      typeof existingDetailFields === "object" &&
      !Array.isArray(existingDetailFields)
    ) {
      obj = { ...(existingDetailFields as Record<string, unknown>) };
    }
  } catch {
    obj = {};
  }

  if (buildingAgePreset === "project") obj.buildingAgePreset = "project";
  else if (buildingAgePreset === "zero") obj.buildingAgePreset = "zero";
  else delete obj.buildingAgePreset;

  const docUrls = (owner.documentUrls ?? [])
    .map((u) => String(u).trim())
    .filter(Boolean);

  const trimmed: OwnerContactPrivate = {
    firstName: owner.firstName.trim(),
    lastName: owner.lastName.trim(),
    phone: owner.phone.trim(),
    email: owner.email.trim(),
    notes: owner.notes.trim(),
    documentUrls: docUrls,
  };

  if (
    !trimmed.firstName &&
    !trimmed.lastName &&
    !trimmed.phone &&
    !trimmed.email &&
    !trimmed.notes &&
    trimmed.documentUrls.length === 0
  ) {
    delete obj[OWNER_CONTACT_PRIVATE_KEY];
  } else {
    obj[OWNER_CONTACT_PRIVATE_KEY] = trimmed;
  }

  return JSON.stringify(obj);
}

/** Kamuya açık ilan sayfası — JSON içinden özel mal sahibi alanını çıkarır */
export function stripOwnerContactPrivateFromDetailFields(raw: unknown): string | null | undefined {
  if (raw == null) return raw as null | undefined;
  try {
    let o: Record<string, unknown>;
    if (typeof raw === "string") {
      const t = raw.trim();
      if (!t) return raw;
      o = JSON.parse(t) as Record<string, unknown>;
    } else if (typeof raw === "object" && !Array.isArray(raw)) {
      o = { ...(raw as Record<string, unknown>) };
    } else {
      return typeof raw === "string" ? raw : undefined;
    }
    if (!(OWNER_CONTACT_PRIVATE_KEY in o)) {
      return typeof raw === "string" ? raw : JSON.stringify(o);
    }
    const next = { ...o };
    delete next[OWNER_CONTACT_PRIVATE_KEY];
    return JSON.stringify(next);
  } catch {
    return typeof raw === "string" ? raw : undefined;
  }
}
