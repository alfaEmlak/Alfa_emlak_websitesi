import { BlogEditor } from "@/components/admin/BlogEditor";
import { requireAdmin } from "@/lib/panel-auth";

export default async function NewBlogPostPage() {
  await requireAdmin();
  return <BlogEditor />;
}
