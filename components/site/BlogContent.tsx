/** İçerikte gerçek HTML etiketi var mı? (varsa olduğu gibi render edilir) */
function looksLikeHtml(s: string): boolean {
  return /<[a-z][\s\S]*?>/i.test(s);
}

/** "1. Başlık", "2) Başlık" gibi numaralı bölüm başlığı mı? */
function isNumberedHeading(line: string): boolean {
  return /^\d+[.)]\s+\S/.test(line);
}

/**
 * Blog içeriğini güzel biçimlendirilmiş şekilde gösterir.
 *
 * - İçerik HTML içeriyorsa olduğu gibi (prose) basılır.
 * - Düz metinse: boş satırlarla ayrılmış bloklara bölünür; numaralı satırlar
 *   başlık, çok satırlı bloklar madde listesi, diğerleri paragraf olur.
 */
export function BlogContent({ content }: { content: string }) {
  if (looksLikeHtml(content)) {
    return (
      <article
        className="prose prose-lg mt-10 max-w-none text-on-surface/80"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  const blocks = content
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0);

  return (
    <article className="mt-10 max-w-none text-on-surface/80">
      {blocks.map((lines, i) => {
        if (lines.length === 1 && isNumberedHeading(lines[0])) {
          return (
            <h2
              key={i}
              className="mt-10 mb-3 font-headline text-xl font-bold text-primary md:text-2xl"
            >
              {lines[0]}
            </h2>
          );
        }

        if (lines.length > 1) {
          return (
            <ul key={i} className="my-4 list-disc space-y-1.5 pl-6 leading-relaxed marker:text-secondary">
              {lines.map((li, j) => (
                <li key={j}>{li}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={i} className="my-4 leading-relaxed">
            {lines[0]}
          </p>
        );
      })}
    </article>
  );
}
