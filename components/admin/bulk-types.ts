/**
 * Toplu işlem tipleri.
 *
 * Server action dosyaları ("use server") yalnızca async fonksiyon dışa
 * aktarabildiği için paylaşılan tipler burada duruyor; hem sunucu hem istemci
 * tarafı bu modülden okur.
 */

export type AdminListingFilter = {
  listingId?: string;
  title?: string;
  city?: string;
  kind?: string;
  propertyType?: string;
  status?: string;
  agent?: string;
};

export type BulkTarget =
  | { mode: "ids"; ids: string[] }
  | { mode: "filter"; filter: AdminListingFilter };

export type BulkAction =
  | "soft_delete"
  | "restore"
  | "purge"
  | "set_status"
  | "review"
  | "assign_agent"
  | "set_featured"
  | "update_price"
  | "set_feed_flags"
  | "set_taxonomy";

export type BulkPayload = {
  /** set_status */
  status?: string;
  /** review */
  decision?: "approve" | "reject";
  /** assign_agent */
  agentId?: string;
  /** set_featured */
  featured?: boolean;
  /** update_price */
  priceMode?: "percent" | "amount";
  priceValue?: number;
  priceRounding?: number;
  /** set_feed_flags */
  export101?: boolean;
  exportHangiev?: boolean;
  /** set_taxonomy */
  kind?: string;
  propertyType?: string;
  city?: string;
  region?: string;
};

export type BulkResult =
  | { ok: true; affected: number; skipped: number; note?: string }
  | { ok: false; error: string };

/** Yıkıcı işlemler — onay adımında adet yazdırılır. */
export const DESTRUCTIVE_BULK_ACTIONS: readonly BulkAction[] = [
  "soft_delete",
  "purge",
  "update_price",
  "set_taxonomy",
];
