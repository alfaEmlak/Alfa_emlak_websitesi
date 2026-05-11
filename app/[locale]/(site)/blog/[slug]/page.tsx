import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getPublishedBlogPostBySlug } from "@/lib/blog-public";

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tc = await getTranslations("Common");

  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-[900px] flex-1 bg-surface px-6 py-16 md:px-8 md:py-24">
      <nav className="font-headline text-xs uppercase tracking-widest text-on-surface/45">
        <Link href="/" className="hover:text-secondary">
          {tc("home")}
        </Link>
        <span className="mx-2">/</span>
        <Link href="/blog" className="hover:text-secondary">
          {tc("blog")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-primary line-clamp-1">{post.title}</span>
      </nav>

      {post.coverImage && (
        <div className="mt-8 overflow-hidden rounded-2xl">
          <img src={post.coverImage} alt={post.title} className="h-auto w-full object-cover" />
        </div>
      )}

      <h1 className="mt-8 font-headline text-3xl font-extrabold tracking-tight text-primary md:text-4xl">
        {post.title}
      </h1>

      <div className="mt-4 flex gap-4 text-sm text-on-surface/45">
        {post.authorName && <span>{post.authorName}</span>}
        {post.publishedAt && (
          <span className="tabular-nums">{new Date(post.publishedAt).toLocaleDateString("tr-TR")}</span>
        )}
      </div>

      <article className="prose prose-lg mt-10 max-w-none text-on-surface/80" dangerouslySetInnerHTML={{ __html: post.content }} />
    </main>
  );
}
