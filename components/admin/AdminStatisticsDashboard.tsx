"use client";

import { useLocale, useTranslations } from "next-intl";
import type { AdminStatistics } from "@/lib/admin-statistics";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PIE_COLORS = [
  "#0d9488",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#64748b",
  "#0891b2",
  "#4f46e5",
];

function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`admin-card flex flex-col overflow-hidden border border-(--ghost-outline) bg-white shadow-[var(--shadow-ambient)] ${className}`}
    >
      <div className="border-b border-(--ghost-outline) px-4 py-3 sm:px-5">
        <h2 className="font-headline text-base font-bold text-(--primary)">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-(--on-surface)/50">{subtitle}</p> : null}
      </div>
      <div className="min-h-[280px] flex-1 p-2 sm:p-4">{children}</div>
    </section>
  );
}

export function AdminStatisticsDashboard({ data }: { data: AdminStatistics }) {
  const t = useTranslations("Panel");
  const locale = useLocale();
  const { listings, agents, blog, inbox, career, dataError, generatedAt } = data;
  const empty = listings.total === 0;

  function fmtMoney(n: number, currency: string) {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency.length === 3 ? currency : "EUR",
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      return `${n.toLocaleString(locale)} ${currency}`;
    }
  }

  function tooltipCount(label: string) {
    return (value: number | undefined): [string, string] => [(value ?? 0).toLocaleString(locale), label];
  }

  const genLabel = new Date(generatedAt).toLocaleString(locale, {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="admin-page-title text-2xl font-extrabold sm:text-3xl">{t("statistics.title")}</h1>
          <p className="mt-1 text-sm text-(--on-surface)/55">
            {t("statistics.intro", { views: t("statistics.viewsCode"), time: genLabel })}
          </p>
        </div>
      </div>

      {dataError ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("statistics.partialData", { detail: dataError })}
        </div>
      ) : null}

      {/* KPI strip */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: t("statistics.metricTotal"), value: listings.total, accent: "text-blue-600", bg: "bg-blue-50" },
          { label: t("statistics.metricPublished"), value: listings.published, accent: "text-emerald-600", bg: "bg-emerald-50" },
          {
            label: t("statistics.metricViews"),
            value: listings.totalViews,
            accent: "text-violet-600",
            bg: "bg-violet-50",
          },
          { label: t("statistics.metricFeatured"), value: listings.featuredCount, accent: "text-amber-600", bg: "bg-amber-50" },
          { label: t("statistics.metricAgents"), value: agents.active, accent: "text-cyan-600", bg: "bg-cyan-50" },
        ].map((k) => (
          <div key={k.label} className="admin-card flex flex-col justify-center p-4">
            <p className="label-sm text-(--on-surface)/45">{k.label}</p>
            <p className={`mt-1 font-headline text-2xl font-extrabold tabular-nums ${k.accent}`}>{k.value.toLocaleString(locale)}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: t("statistics.metricBlogPublished"), value: blog.published },
          { label: t("statistics.metricInboxTotal"), value: inbox.total },
          { label: t("statistics.metricInboxUnread"), value: inbox.unread },
          { label: t("statistics.metricCareer"), value: career.total },
        ].map((k) => (
          <div key={k.label} className="admin-card rounded-xl border border-(--ghost-outline)/80 px-4 py-3">
            <p className="text-xs text-(--on-surface)/50">{k.label}</p>
            <p className="mt-1 font-headline text-xl font-bold text-(--primary)">{k.value.toLocaleString(locale)}</p>
          </div>
        ))}
      </div>

      {empty ? (
        <p className="mt-10 rounded-xl border border-dashed border-(--ghost-outline) bg-(--surface-lowest) px-6 py-12 text-center text-(--on-surface)/60">
          {t("statistics.emptyNoListings")}
        </p>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <ChartCard title={t("statistics.chartStatusTitle")} subtitle={t("statistics.chartStatusSub")}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={listings.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {listings.byStatus.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipCount(t("statistics.unitListing"))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t("statistics.chartKindTitle")} subtitle={t("statistics.chartKindSub")}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={listings.byKind} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={70} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={tooltipCount(t("statistics.countUnit"))} />
                <Bar dataKey="value" fill="#0d9488" radius={[6, 6, 0, 0]} name={t("statistics.unitListing")} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t("statistics.chartCategoryTitle")} subtitle={t("statistics.chartCategorySub")}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart layout="vertical" data={listings.byCategory} margin={{ left: 16, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11 }} />
                <Tooltip formatter={tooltipCount(t("statistics.unitListing"))} />
                <Bar dataKey="value" fill="#2563eb" radius={[0, 6, 6, 0]} name={t("statistics.unitListing")} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t("statistics.chartCityTitle")} subtitle={t("statistics.chartCitySub")}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart layout="vertical" data={listings.topCities} margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                <Tooltip formatter={tooltipCount(t("statistics.unitListing"))} />
                <Bar dataKey="value" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t("statistics.chartMonthlyTitle")} subtitle={t("statistics.chartMonthlySub")}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={listings.monthlyCreated} margin={{ left: 0, right: 8 }}>
                <defs>
                  <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={1} angle={-35} textAnchor="end" height={70} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={tooltipCount(t("statistics.newListingLabel"))} />
                <Area type="monotone" dataKey="count" stroke="#0d9488" fillOpacity={1} fill="url(#colorNew)" name={t("statistics.newShort")} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t("statistics.chartDistrictTitle")} subtitle={t("statistics.chartDistrictSub")}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart layout="vertical" data={listings.topRegions} margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={tooltipCount(t("statistics.unitListing"))} />
                <Bar dataKey="value" fill="#db2777" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t("statistics.chartAvgPriceTitle")} subtitle={t("statistics.chartAvgPriceSub")}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={listings.currencyAvg} margin={{ bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="currency" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number | undefined, _name, item) => {
                    const cur = (item?.payload as { currency?: string })?.currency ?? "EUR";
                    return [fmtMoney(Number(value ?? 0), cur), t("statistics.avgLabel")];
                  }}
                />
                <Bar dataKey="avg" fill="#ea580c" radius={[6, 6, 0, 0]} name={t("statistics.avgLabel")} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t("statistics.chartTopViewsTitle")} subtitle={t("statistics.chartTopViewsSub")}>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart layout="vertical" data={listings.topByViews} margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="listingId"
                  width={88}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => String(v).slice(0, 14)}
                />
                <Tooltip
                  formatter={tooltipCount(t("statistics.unitView"))}
                  labelFormatter={(_, payload) => {
                    const item = Array.isArray(payload) ? payload[0] : payload;
                    const p = item?.payload as { title?: string; city?: string } | undefined;
                    return p?.title
                      ? `${p.title.slice(0, 60)}${p.title.length > 60 ? "…" : ""} (${p.city ?? ""})`
                      : "";
                  }}
                />
                <Bar dataKey="views" fill="#16a34a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t("statistics.chartByAgentTitle")} subtitle={t("statistics.chartByAgentSub")}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart layout="vertical" data={listings.agentRanks} margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                <Tooltip formatter={tooltipCount(t("statistics.unitListing"))} />
                <Bar dataKey="count" fill="#0891b2" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t("statistics.chartBadgesTitle")} subtitle={t("statistics.chartBadgesSub")}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={[
                  { name: t("statistics.mediaVideo"), v: listings.withVideo },
                  { name: t("statistics.mediaTour"), v: listings.withVirtualTour },
                  { name: t("statistics.badgeFeatured"), v: listings.featuredCount },
                  { name: t("statistics.mediaExclusive"), v: listings.exclusiveCount },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={tooltipCount(t("statistics.unitListing"))} />
                <Bar dataKey="v" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t("statistics.chartBlogTitle")} subtitle={t("statistics.chartBlogSub")}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={[
                    { name: t("statistics.blogPublished"), value: blog.published },
                    { name: t("statistics.blogDraft"), value: blog.draft },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={88}
                  label
                >
                  <Cell fill="#0d9488" />
                  <Cell fill="#94a3b8" />
                </Pie>
                <Tooltip formatter={tooltipCount(t("statistics.unitPost"))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t("statistics.chartInboxTitle")} subtitle={t("statistics.chartInboxSub")}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={inbox.byStatus.length ? inbox.byStatus : [{ name: t("statistics.inboxEmptyBar"), value: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={70} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={tooltipCount(t("statistics.countUnit"))} />
                <Bar dataKey="value" fill="#ca8a04" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t("statistics.chartTrendTitle")} subtitle={t("statistics.chartTrendSub")}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={listings.monthlyCreated} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={1} angle={-35} textAnchor="end" height={70} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={tooltipCount(t("statistics.newListingLabel"))} />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} name={t("statistics.newListingLabel")} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      <div className="mt-10 rounded-xl border border-(--ghost-outline) bg-(--surface-lowest) px-4 py-3 text-xs text-(--on-surface)/50">
        <p>{t("statistics.footnote")}</p>
      </div>
    </div>
  );
}
