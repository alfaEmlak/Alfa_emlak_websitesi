import { supabaseAdmin } from "@/lib/supabase/admin";

/** Site vitrin / liste kartı (admin Supabase `blog_posts` ile uyumlu). */
export type BlogPostCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  authorName: string | null;
  publishedAt: string | null;
};

type BlogRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  author_name: string | null;
  published_at: string | null;
};

function mapCardRow(row: BlogRow): BlogPostCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverImage: row.cover_image,
    authorName: row.author_name,
    publishedAt: row.published_at,
  };
}

/** Ana sayfa — yayınlanmış son yazılar (admin panelinde kayıtlı gerçek kaynak: Supabase). */
export async function getRecentPublishedBlogPosts(limit = 6): Promise<BlogPostCard[]> {
  const { data, error } = await supabaseAdmin
    .from("blog_posts")
    .select("id, slug, title, excerpt, cover_image, author_name, published_at")
    .eq("status", "PUBLISHED")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !data?.length) return [];
  return (data as BlogRow[]).map(mapCardRow);
}

/** Blog liste sayfası */
export async function getPublishedBlogPosts(): Promise<BlogPostCard[]> {
  const { data, error } = await supabaseAdmin
    .from("blog_posts")
    .select("id, slug, title, excerpt, cover_image, author_name, published_at")
    .eq("status", "PUBLISHED")
    .order("published_at", { ascending: false, nullsFirst: false });

  if (error || !data?.length) return [];
  return (data as BlogRow[]).map(mapCardRow);
}

export type BlogPostDetail = BlogPostCard & { content: string };

/** Tekil yazı — slug küçük harf normalize (admin kaydı ile eşleşsin). */
export async function getPublishedBlogPostBySlug(slug: string): Promise<BlogPostDetail | null> {
  const normalized = slug.trim().toLowerCase();
  const { data, error } = await supabaseAdmin
    .from("blog_posts")
    .select("id, slug, title, excerpt, content, cover_image, author_name, published_at")
    .eq("slug", normalized)
    .eq("status", "PUBLISHED")
    .maybeSingle();

  if (error || !data) return null;

  const row = data as BlogRow & { content: string };
  return {
    ...mapCardRow(row),
    content: row.content ?? "",
  };
}
