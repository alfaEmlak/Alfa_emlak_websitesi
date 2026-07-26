import type { BulkBarLabels } from "@/components/admin/BulkActionsBar";
import type { BulkDrawerLabels } from "@/components/admin/BulkActionsDrawer";

/**
 * Toplu işlem bileşenleri istemci tarafında çalıştığı için çeviriler sunucuda
 * çözülüp prop olarak geçiliyor — panelde ListingActionsMenu ile aynı desen.
 */

type Translator = (key: string) => string;

export function buildBulkBarLabels(t: Translator): BulkBarLabels {
  return {
    selectedCount: t("bulk.selectedCount"),
    selectAllMatching: t("bulk.selectAllMatching"),
    clear: t("bulk.clear"),
    openDrawer: t("bulk.openDrawer"),
    allMatchingActive: t("bulk.allMatchingActive"),
  };
}

const ACTION_KEYS = [
  "set_status",
  "review",
  "assign_agent",
  "set_featured",
  "update_price",
  "set_taxonomy",
  "set_feed_flags",
  "csv",
  "soft_delete",
  "restore",
  "purge",
] as const;

const ERROR_KEYS = [
  "no_targets",
  "too_many",
  "db_error",
  "unknown_action",
  "invalid_status",
  "invalid_decision",
  "agent_not_found",
  "invalid_price_mode",
  "invalid_price_value",
  "invalid_kind",
  "no_changes",
] as const;

export function buildBulkDrawerLabels(t: Translator): BulkDrawerLabels {
  const actions: BulkDrawerLabels["actions"] = {};
  for (const key of ACTION_KEYS) {
    actions[key] = {
      label: t(`bulk.actions.${key}.label`),
      description: t(`bulk.actions.${key}.description`),
    };
  }

  const errors: Record<string, string> = {};
  for (const key of ERROR_KEYS) {
    errors[key] = t(`bulk.errors.${key}`);
  }

  return {
    title: t("bulk.title"),
    scopeSelection: t("bulk.scopeSelection"),
    scopeFilter: t("bulk.scopeFilter"),
    close: t("bulk.close"),
    back: t("bulk.back"),
    run: t("bulk.run"),
    running: t("bulk.running"),
    cancel: t("bulk.cancel"),
    confirmTypeCount: t("bulk.confirmTypeCount"),
    confirmPlaceholder: t("bulk.confirmPlaceholder"),
    irreversible: t("bulk.irreversible"),
    reversible: t("bulk.reversible"),
    resultSuccess: t("bulk.resultSuccess"),
    resultSkipped: t("bulk.resultSkipped"),
    resultError: t("bulk.resultError"),
    noteNoPhoto: t("bulk.noteNoPhoto"),
    noteFeaturedLimit: t("bulk.noteFeaturedLimit"),
    noteFeedFlagsReset: t("bulk.noteFeedFlagsReset"),
    groups: {
      status: t("bulk.groups.status"),
      moderation: t("bulk.groups.moderation"),
      assign: t("bulk.groups.assign"),
      content: t("bulk.groups.content"),
      feed: t("bulk.groups.feed"),
      export: t("bulk.groups.export"),
      danger: t("bulk.groups.danger"),
    },
    actions,
    fields: {
      status: t("bulk.fields.status"),
      decision: t("bulk.fields.decision"),
      approve: t("bulk.fields.approve"),
      reject: t("bulk.fields.reject"),
      agent: t("bulk.fields.agent"),
      featuredOn: t("bulk.fields.featuredOn"),
      featuredOff: t("bulk.fields.featuredOff"),
      priceMode: t("bulk.fields.priceMode"),
      pricePercent: t("bulk.fields.pricePercent"),
      priceAmount: t("bulk.fields.priceAmount"),
      priceValue: t("bulk.fields.priceValue"),
      priceRounding: t("bulk.fields.priceRounding"),
      priceHint: t("bulk.fields.priceHint"),
      export101: t("bulk.fields.export101"),
      exportHangiev: t("bulk.fields.exportHangiev"),
      on: t("bulk.fields.on"),
      off: t("bulk.fields.off"),
      unchanged: t("bulk.fields.unchanged"),
      kind: t("bulk.fields.kind"),
      propertyType: t("bulk.fields.propertyType"),
      city: t("bulk.fields.city"),
      region: t("bulk.fields.region"),
      taxonomyHint: t("bulk.fields.taxonomyHint"),
      csvHint: t("bulk.fields.csvHint"),
      choose: t("bulk.fields.choose"),
    },
    errors,
  };
}
