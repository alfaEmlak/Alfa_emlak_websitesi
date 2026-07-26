import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  LISTING_CATEGORY_LABEL_TR,
  parseListingPropertyType,
  type ListingCategoryKey,
} from "@/lib/listing-property-taxonomy";

export type NameValue = { name: string; value: number };
export type MonthlyCount = { key: string; label: string; count: number };
export type TopViewRow = { listingId: string; title: string; views: number; city: string };
export type AgentRank = { name: string; count: number; id: string };
export type CurrencyAvg = { currency: string; avg: number; count: number };

export type AdminStatistics = {
  generatedAt: string;
  dataError: string | null;
  listings: {
    total: number;
    published: number;
    byStatus: NameValue[];
    byKind: NameValue[];
    byCategory: NameValue[];
    topCities: NameValue[];
    topRegions: NameValue[];
    monthlyCreated: MonthlyCount[];
    totalViews: number;
    featuredCount: number;
    exclusiveCount: number;
    withVideo: number;
    withVirtualTour: number;
    currencyAvg: CurrencyAvg[];
    topByViews: TopViewRow[];
    agentRanks: AgentRank[];
  };
  agents: { total: number; active: number; consultants: number };
  blog: { published: number; draft: number; total: number };
  inbox: { total: number; unread: number; byStatus: NameValue[] };
  career: { total: number };
};

type ListingRow = {
  id: string;
  listing_id: string;
  title: string;
  publish_status: string;
  kind: string;
  property_type: string;
  city: string;
  region: string;
  price: number;
  currency: string;
  views: number | string | null;
  created_at: string;
  badges: unknown;
  video_enabled: boolean | null;
  virtual_tour_enabled: boolean | null;
  created_by_agent_id: string | null;
};

function parseBadgeFlags(badgesRaw: unknown): { featured: boolean; exclusive: boolean } {
  let o: Record<string, unknown> = {};
  if (typeof badgesRaw === "string" && badgesRaw.trim()) {
    try {
      const p = JSON.parse(badgesRaw) as unknown;
      o = p && typeof p === "object" && !Array.isArray(p) ? (p as Record<string, unknown>) : {};
    } catch {
      o = {};
    }
  } else if (badgesRaw && typeof badgesRaw === "object" && !Array.isArray(badgesRaw)) {
    o = badgesRaw as Record<string, unknown>;
  }
  return {
    featured: !!o.featured,
    exclusive: !!o.exclusive,
  };
}

function numViews(v: number | string | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : 0;
}

const STATUS_LABELS: Record<string, string> = {
  PUBLISHED: "Yayında",
  DRAFT: "Taslak",
  PENDING_APPROVAL: "Onay bekliyor",
  HIDDEN: "Gizli",
  REJECTED: "Reddedildi",
};

const KIND_LABELS: Record<string, string> = {
  SATILIK: "Satılık",
  KIRALIK: "Kiralık",
  GUNLUK_KIRALIK: "Günlük kiralık",
  PROJE: "Proje",
};

const MSG_STATUS_LABELS: Record<string, string> = {
  NEW: "Yeni",
  CONTACTED: "İletişime geçildi",
  PRESENTED: "Sunuldu",
  CLOSED_WON: "Kazanıldı",
  CLOSED_LOST: "Kayıp",
};

function inc(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

function mapToNameValues(map: Map<string, number>, labels: Record<string, string>): NameValue[] {
  return [...map.entries()]
    .map(([k, v]) => ({ name: labels[k] ?? k, value: v }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
}

async function fetchAllListings(): Promise<{ rows: ListingRow[]; error: string | null }> {
  const rows: ListingRow[] = [];
  const pageSize = 1000;
  let offset = 0;
  let lastError: string | null = null;

  const columns =
    "id, listing_id, title, publish_status, kind, property_type, city, region, price, currency, views, created_at, badges, video_enabled, virtual_tour_enabled, created_by_agent_id";

  for (;;) {
    const { data, error } = await supabaseAdmin
      .from("listings")
      .select(columns)
      .is("deleted_at", null)
      .range(offset, offset + pageSize - 1);

    if (error) {
      lastError = error.message;
      break;
    }
    const batch = (data ?? []) as ListingRow[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return { rows, error: lastError };
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const months = [
    "Oca",
    "Şub",
    "Mar",
    "Nis",
    "May",
    "Haz",
    "Tem",
    "Ağu",
    "Eyl",
    "Eki",
    "Kas",
    "Ara",
  ];
  return `${months[(m ?? 1) - 1]} ${y}`;
}

function buildLast12Months(): MonthlyCount[] {
  const out: MonthlyCount[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    out.push({ key, label: monthLabel(key), count: 0 });
  }
  return out;
}

export async function getAdminStatistics(): Promise<AdminStatistics> {
  const generatedAt = new Date().toISOString();
  let dataError: string | null = null;

  const { rows: listings, error: listErr } = await fetchAllListings();
  if (listErr) {
    dataError = `İlanlar okunamadı: ${listErr}`;
  }

  const statusMap = new Map<string, number>();
  const kindMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();
  const cityMap = new Map<string, number>();
  const regionMap = new Map<string, number>();
  const monthlyMap = new Map<string, number>();
  const currencySum = new Map<string, { sum: number; count: number }>();
  const agentListingCount = new Map<string, number>();

  let published = 0;
  let totalViews = 0;
  let featuredCount = 0;
  let exclusiveCount = 0;
  let withVideo = 0;
  let withVirtualTour = 0;

  const monthlyTemplate = buildLast12Months();
  for (const m of monthlyTemplate) {
    monthlyMap.set(m.key, 0);
  }

  for (const L of listings) {
    inc(statusMap, L.publish_status ?? "UNKNOWN");
    inc(kindMap, L.kind ?? "UNKNOWN");

    const tax = parseListingPropertyType(L.property_type);
    const cat = tax.category as ListingCategoryKey;
    inc(categoryMap, LISTING_CATEGORY_LABEL_TR[cat] ?? cat);

    const city = (L.city ?? "").trim() || "—";
    inc(cityMap, city);

    const reg = (L.region ?? "").trim();
    if (reg) {
      inc(regionMap, reg);
    }

    const created = L.created_at ? new Date(L.created_at) : null;
    if (created && !Number.isNaN(created.getTime())) {
      const mk = monthKey(created);
      if (monthlyMap.has(mk)) {
        monthlyMap.set(mk, (monthlyMap.get(mk) ?? 0) + 1);
      }
    }

    const cur = (L.currency ?? "EUR").toUpperCase();
    const p = Number(L.price);
    if (Number.isFinite(p) && p > 0 && L.publish_status === "PUBLISHED") {
      const prev = currencySum.get(cur) ?? { sum: 0, count: 0 };
      currencySum.set(cur, { sum: prev.sum + p, count: prev.count + 1 });
    }

    if (L.publish_status === "PUBLISHED") published += 1;

    const v = numViews(L.views);
    if (L.publish_status === "PUBLISHED") {
      totalViews += v;
    }

    const bf = parseBadgeFlags(L.badges);
    if (bf.featured) featuredCount += 1;
    if (bf.exclusive) exclusiveCount += 1;
    if (L.video_enabled) withVideo += 1;
    if (L.virtual_tour_enabled) withVirtualTour += 1;

    const aid = L.created_by_agent_id;
    if (aid) {
      inc(agentListingCount, aid);
    }
  }

  const monthlyCreated: MonthlyCount[] = monthlyTemplate.map((m) => ({
    ...m,
    count: monthlyMap.get(m.key) ?? 0,
  }));

  const topCities = [...cityMap.entries()]
    .filter(([k]) => k !== "—")
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  const topRegions = [...regionMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  const currencyAvg: CurrencyAvg[] = [...currencySum.entries()].map(([currency, { sum, count }]) => ({
    currency,
    avg: count ? Math.round((sum / count) * 100) / 100 : 0,
    count,
  }));

  const topByViews = [...listings]
    .filter((L) => L.publish_status === "PUBLISHED")
    .sort((a, b) => numViews(b.views) - numViews(a.views))
    .slice(0, 10)
    .map((L) => ({
      listingId: L.listing_id,
      title: L.title?.slice(0, 80) ?? L.listing_id,
      views: numViews(L.views),
      city: (L.city ?? "").trim() || "—",
    }));

  const { data: agentsData, error: agentsErr } = await supabaseAdmin
    .from("agents")
    .select("id, name, is_active, role");

  if (agentsErr && !dataError) {
    dataError = `Danışmanlar okunamadı: ${agentsErr.message}`;
  }

  const agents = (agentsData ?? []) as { id: string; name: string; is_active: boolean; role: string }[];
  const agentNameById = new Map(agents.map((a) => [a.id, a.name]));

  const agentRanks: AgentRank[] = [...agentListingCount.entries()]
    .map(([id, count]) => ({
      id,
      name: agentNameById.get(id) ?? id.slice(0, 8),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const agentsTotal = agents.length;
  const agentsActive = agents.filter((a) => a.is_active).length;
  const consultants = agents.filter((a) => a.role !== "ADMIN").length;

  let blogPublished = 0;
  let blogDraft = 0;
  const { data: blogRows, error: blogErr } = await supabaseAdmin.from("blog_posts").select("status");
  if (blogErr && !dataError) {
    dataError = `Blog okunamadı: ${blogErr.message}`;
  }
  for (const r of blogRows ?? []) {
    const st = String((r as { status?: string }).status ?? "");
    if (st === "PUBLISHED") blogPublished += 1;
    else blogDraft += 1;
  }

  let inboxTotal = 0;
  let inboxUnread = 0;
  const inboxStatusMap = new Map<string, number>();
  const { data: msgRows, error: msgErr } = await supabaseAdmin
    .from("contact_messages")
    .select("is_read, status");
  if (msgErr && !dataError) {
    dataError = `Mesajlar okunamadı: ${msgErr.message}`;
  }
  for (const r of msgRows ?? []) {
    inboxTotal += 1;
    const row = r as { is_read?: boolean; status?: string };
    if (!row.is_read) inboxUnread += 1;
    const st = row.status ?? "UNKNOWN";
    inc(inboxStatusMap, st);
  }

  let careerTotal = 0;
  const { count: careerCount, error: careerErr } = await supabaseAdmin
    .from("career_applications")
    .select("*", { count: "exact", head: true });
  if (!careerErr) {
    careerTotal = careerCount ?? 0;
  }

  const byStatus = mapToNameValues(statusMap, STATUS_LABELS);
  const byKind = mapToNameValues(kindMap, KIND_LABELS);
  const byCategory = [...categoryMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const inboxByStatus = mapToNameValues(inboxStatusMap, MSG_STATUS_LABELS);

  return {
    generatedAt,
    dataError,
    listings: {
      total: listings.length,
      published,
      byStatus,
      byKind,
      byCategory,
      topCities,
      topRegions,
      monthlyCreated,
      totalViews,
      featuredCount,
      exclusiveCount,
      withVideo,
      withVirtualTour,
      currencyAvg,
      topByViews,
      agentRanks,
    },
    agents: {
      total: agentsTotal,
      active: agentsActive,
      consultants,
    },
    blog: {
      published: blogPublished,
      draft: blogDraft,
      total: blogPublished + blogDraft,
    },
    inbox: {
      total: inboxTotal,
      unread: inboxUnread,
      byStatus: inboxByStatus,
    },
    career: {
      total: careerTotal,
    },
  };
}
