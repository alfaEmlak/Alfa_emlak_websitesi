import { AdminStatisticsDashboard } from "@/components/admin/AdminStatisticsDashboard";
import { getAdminStatistics } from "@/lib/admin-statistics";
import { requireAdmin } from "@/lib/panel-auth";

export default async function AdminIstatistiklerPage() {
  await requireAdmin();
  const stats = await getAdminStatistics();
  return <AdminStatisticsDashboard data={stats} />;
}
