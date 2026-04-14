import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { BlogEditor } from "@/components/admin/BlogEditor";

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: post, error } = await supabaseAdmin
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !post) notFound();

  return (
    <BlogEditor
      initial={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt ?? "",
        content: post.content,
        coverImage: post.cover_image ?? "",
        authorName: post.author_name ?? "",
        status: post.status,
      }}
    />
  );
}
