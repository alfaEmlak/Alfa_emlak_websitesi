import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getPublishedBlogPosts } from "@/lib/blog-public";

export default async function BlogPage() {
  const t = await getTranslations("BlogPage");
  const tc = await getTranslations("Common");

  const posts = await getPublishedBlogPosts();

  return (
    <main className="mx-auto max-w-[1440px] flex-1 bg-surface px-6 py-16 md:px-8 md:py-24">
      <nav className="font-headline text-xs uppercase tracking-widest text-on-surface/45">
        <Link href="/" className="hover:text-secondary">
          {tc("home")}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-primary">{t("title")}</span>
      </nav>

      <h1 className="mt-8 font-headline text-4xl font-extrabold tracking-tight text-primary md:text-5xl">
        {t("title")}
      </h1>

      {posts.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-6xl text-on-surface/15">article</span>
          <p className="mt-4 text-lg font-semibold text-on-surface/40">{t("noPosts")}</p>
        </div>
      ) : (
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group overflow-hidden rounded-2xl bg-surface-lowest shadow-[var(--shadow-ambient)] ring-1 ring-primary/[0.08] transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              {post.coverImage && (
                <div className="aspect-[16/9] overflow-hidden">
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              )}
              <div className="p-6">
                <h2 className="font-headline text-lg font-bold text-primary line-clamp-2">{post.title}</h2>
                {post.excerpt && (
                  <p className="mt-2 text-sm leading-relaxed text-on-surface/50 line-clamp-3">{post.excerpt}</p>
                )}
                <div className="mt-4 flex items-center justify-between text-xs text-on-surface/40">
                  {post.authorName && <span>{post.authorName}</span>}
                  {post.publishedAt && (
                    <span className="tabular-nums">{new Date(post.publishedAt).toLocaleDateString("tr-TR")}</span>
                  )}
                </div>
                <span className="mt-3 inline-block text-sm font-semibold text-secondary group-hover:underline">
                  {t("readMore")} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
