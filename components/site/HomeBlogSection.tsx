import { Link } from "@/i18n/routing";
import type { BlogPostCard } from "@/lib/blog-public";

const DATE_LOCALE: Record<string, string> = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  ru: "ru-RU",
  fa: "fa-IR",
};

export function HomeBlogSection({
  posts,
  locale,
  label,
  title,
  viewAll,
  readMore,
}: {
  posts: BlogPostCard[];
  locale: string;
  label: string;
  title: string;
  viewAll: string;
  readMore: string;
}) {
  if (posts.length === 0) return null;

  const dateLocale = DATE_LOCALE[locale] ?? "en-US";

  return (
    <section className="bg-surface-low px-6 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-14 flex flex-col items-baseline justify-between gap-8 md:mb-16 md:flex-row md:items-end">
          <div className="max-w-xl">
            <span className="label-sm mb-4 block text-secondary" style={{ fontSize: "11px", letterSpacing: "0.12em" }}>
              {label}
            </span>
            <h2 className="font-headline text-4xl font-extrabold leading-none tracking-tight text-primary md:text-5xl">{title}</h2>
          </div>
          <Link
            href="/blog"
            className="group flex items-center gap-2 font-headline text-sm font-bold tracking-wider text-primary underline decoration-primary/25 decoration-2 underline-offset-4 transition hover:text-secondary hover:decoration-secondary"
          >
            {viewAll}
            <span aria-hidden className="text-base leading-none transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group overflow-hidden rounded-2xl bg-surface-lowest shadow-[var(--shadow-ambient)] ring-1 ring-primary/[0.08] transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              {post.coverImage ? (
                <div className="aspect-[16/9] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element -- external / arbitrary URLs like blog list */}
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="aspect-[16/9] bg-gradient-to-br from-primary/15 to-primary/5" aria-hidden />
              )}
              <div className="p-6">
                <h3 className="font-headline text-lg font-bold text-primary line-clamp-2">{post.title}</h3>
                {post.excerpt ? (
                  <p className="mt-2 text-sm leading-relaxed text-on-surface/50 line-clamp-3">{post.excerpt}</p>
                ) : null}
                <div className="mt-4 flex items-center justify-between gap-2 text-xs text-on-surface/40">
                  {post.authorName ? <span className="truncate">{post.authorName}</span> : <span />}
                  {post.publishedAt ? (
                    <span className="shrink-0 tabular-nums">
                      {new Date(post.publishedAt).toLocaleDateString(dateLocale)}
                    </span>
                  ) : null}
                </div>
                <span className="mt-3 inline-block text-sm font-semibold text-secondary group-hover:underline">
                  {readMore} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
