/**
 * Proje ilanlarının teslim tarihi — detailFields içinde "deliveryDate" anahtarıyla
 * "YYYY-MM" biçiminde tutulur. Alan isteğe bağlıdır; boşsa hiç yazılmaz.
 */

export const DELIVERY_DATE_DETAIL_KEY = "deliveryDate";

const YEAR_MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

function toMap(detailFields: unknown): Record<string, unknown> {
  if (typeof detailFields === "string" && detailFields.trim()) {
    try {
      const o = JSON.parse(detailFields) as unknown;
      return o && typeof o === "object" && !Array.isArray(o) ? (o as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  if (detailFields && typeof detailFields === "object" && !Array.isArray(detailFields)) {
    return detailFields as Record<string, unknown>;
  }
  return {};
}

/** Kayıtlı teslim tarihini "YYYY-MM" olarak döner; yoksa / geçersizse "". */
export function parseDeliveryDateFromDetailFields(detailFields: unknown): string {
  const entry = toMap(detailFields)[DELIVERY_DATE_DETAIL_KEY] as { value?: unknown } | undefined;
  const raw = String(entry?.value ?? "").trim();
  return YEAR_MONTH.test(raw) ? raw : "";
}

/** Yalnızca proje ilanlarında ve geçerli bir değer varsa yazar; aksi halde anahtarı siler. */
export function mergeDeliveryDateDetailFields(
  existingDetailFieldsJson: string,
  applicable: boolean,
  value: string,
): string {
  const obj = toMap(existingDetailFieldsJson);
  delete obj[DELIVERY_DATE_DETAIL_KEY];
  const v = String(value ?? "").trim();
  if (applicable && YEAR_MONTH.test(v)) {
    obj[DELIVERY_DATE_DETAIL_KEY] = { value: v, visible: true };
  }
  return JSON.stringify(obj);
}

/** "2027-06" → "Haziran 2027" (sitenin diline göre). */
export function formatDeliveryDate(value: string, locale: string): string {
  const m = YEAR_MONTH.exec(String(value ?? "").trim());
  if (!m) return "";
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  try {
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  } catch {
    return `${m[2]}/${m[1]}`;
  }
}
