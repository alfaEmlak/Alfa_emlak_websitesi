import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getAdminSession } from "@/lib/admin-auth";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session.isAdmin) redirect("/admin");

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="admin-scroll admin-shell flex-1 overflow-x-auto text-[var(--on-surface)]">{children}</div>
    </div>
  );
}
