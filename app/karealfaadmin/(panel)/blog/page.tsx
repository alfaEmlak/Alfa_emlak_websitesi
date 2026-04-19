import Link from "next/link";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { requireAdmin } from "@/lib/panel-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function BlogAdminPage() {
  await requireAdmin();
  const { data: posts } = await supabaseAdmin
    .from("blog_posts")
    .select("id, title, slug, status, published_at, created_at")
    .order("created_at", { ascending: false });

  const blogPosts = posts || [];

  return (
    <div className="p-6 lg:p-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="admin-page-title text-3xl font-extrabold">Blog Yönetimi</h1>
          <p className="mt-1 text-sm text-(--on-surface)/55">Makale ve duyuruları yönetin</p>
        </div>
        <Link
          href="/karealfaadmin/blog/yeni"
          className="flex items-center gap-2 rounded-xl bg-(--secondary) px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:opacity-90"
        >
          <AdminIcon name="add" size={18} />
          Yeni Yazı
        </Link>
      </div>

      {blogPosts.length === 0 ? (
        <div className="admin-card mt-8 flex flex-col items-center justify-center p-16 text-center">
          <AdminIcon name="article" size={48} className="text-(--on-surface)/20" />
          <p className="mt-4 text-lg font-semibold text-(--on-surface)/40">Henüz blog yazısı yok</p>
        </div>
      ) : (
        <div className="admin-card mt-8 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-(--ghost-outline) bg-(--surface-container-low)/80 text-xs font-semibold uppercase tracking-wide text-(--primary)/55">
              <tr>
                <th className="px-4 py-3">Başlık</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-(--ghost-outline) bg-surface-lowest">
              {blogPosts.map((p) => (
                <tr key={p.id} className="transition hover:bg-(--surface-container-low)/50">
                  <td className="max-w-xs truncate px-4 py-3 font-medium text-on-surface">{p.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-(--on-surface)/70">{p.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      p.status === "PUBLISHED"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}>
                      {p.status === "PUBLISHED" ? "Yayında" : "Taslak"}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-xs text-(--on-surface)/50">
                    {new Date(p.created_at).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/karealfaadmin/blog/${p.id}/duzenle`}
                      className="font-semibold text-(--secondary) hover:underline"
                    >
                      Düzenle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
