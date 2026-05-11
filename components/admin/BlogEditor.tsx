"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { saveBlogPost } from "@/app/karealfaadmin/module-actions";
import { DEFAULT_BLOG_COVER_URL, isDefaultAlfaBlogCover } from "@/lib/blog-editor-defaults";

type BlogPostData = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  authorName: string;
  status: string;
};

export function BlogEditor({ initial }: { initial?: BlogPostData }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<BlogPostData>(
    initial ?? {
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      coverImage: "",
      authorName: "",
      status: "DRAFT",
    },
  );
  const [useAlfaLogo, setUseAlfaLogo] = useState(() => isDefaultAlfaBlogCover(initial?.coverImage));
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function autoSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[ğ]/g, "g")
      .replace(/[ü]/g, "u")
      .replace(/[ş]/g, "s")
      .replace(/[ı]/g, "i")
      .replace(/[ö]/g, "o")
      .replace(/[ç]/g, "c")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  function set<K extends keyof BlogPostData>(key: K, value: BlogPostData[K]) {
    setData((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "title" && !initial) next.slug = autoSlug(value as string);
      return next;
    });
  }

  function handleAlfaLogoToggle(checked: boolean) {
    setUseAlfaLogo(checked);
    setUploadError(null);
    if (checked) {
      setData((prev) => ({ ...prev, coverImage: DEFAULT_BLOG_COVER_URL }));
    } else if (isDefaultAlfaBlogCover(data.coverImage)) {
      setData((prev) => ({ ...prev, coverImage: "" }));
    }
  }

  async function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    setUploadError(null);
    setUseAlfaLogo(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error || "Görsel yüklenemedi.");
      }
      setData((prev) => ({ ...prev, coverImage: json.url! }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Görsel yüklenemedi.");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        ...data,
        coverImage: useAlfaLogo ? DEFAULT_BLOG_COVER_URL : data.coverImage.trim(),
      };
      await saveBlogPost(payload);
      router.push("/karealfaadmin/blog");
      router.refresh();
    } catch (e) {
      alert("Hata: " + (e instanceof Error ? e.message : "Bilinmeyen hata"));
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-(--ghost-outline) bg-(--surface-container-lowest) px-3 py-2.5 text-sm text-on-surface placeholder:text-(--on-surface)/30 focus:border-(--secondary) focus:outline-none focus:ring-2 focus:ring-(--secondary)/20";

  const coverPreviewSrc =
    useAlfaLogo || data.coverImage ? (useAlfaLogo ? DEFAULT_BLOG_COVER_URL : data.coverImage) : null;
  const showLocalPreview = coverPreviewSrc?.startsWith("/");

  return (
    <div className="p-6 lg:p-10">
      <h1 className="admin-page-title text-3xl font-extrabold">
        {initial ? "Blog Yazısı Düzenle" : "Yeni Blog Yazısı"}
      </h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-5">
          <div className="admin-card space-y-4 p-5">
            <div>
              <label className="label-sm mb-1 block text-(--on-surface)/50">Başlık</label>
              <input className={inputCls} value={data.title} onChange={(e) => set("title", e.target.value)} placeholder="Blog yazısı başlığı" />
            </div>
            <div>
              <label className="label-sm mb-1 block text-(--on-surface)/50">Slug (URL)</label>
              <input className={inputCls} value={data.slug} onChange={(e) => set("slug", e.target.value)} placeholder="blog-yazisi-basligi" />
            </div>
            <div>
              <label className="label-sm mb-1 block text-(--on-surface)/50">Özet</label>
              <textarea
                className={inputCls}
                rows={2}
                value={data.excerpt}
                onChange={(e) => set("excerpt", e.target.value)}
                placeholder="Kısa özet (listelemelerde gözükür)"
              />
            </div>
            <div>
              <label className="label-sm mb-1 block text-(--on-surface)/50">İçerik (Markdown/HTML)</label>
              <textarea
                className={inputCls}
                rows={12}
                value={data.content}
                onChange={(e) => set("content", e.target.value)}
                placeholder="Blog yazısını buraya girin..."
              />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="admin-card space-y-4 p-5">
            <div>
              <label className="label-sm mb-1 block text-(--on-surface)/50">Durum</label>
              <select className={inputCls} value={data.status} onChange={(e) => set("status", e.target.value)}>
                <option value="DRAFT">Taslak</option>
                <option value="PUBLISHED">Yayınla</option>
              </select>
            </div>

            <div className="border-t border-(--ghost-outline)/60 pt-4">
              <p className="label-sm mb-3 block text-(--on-surface)/50">Kapak görseli</p>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-(--ghost-outline)/80 bg-(--surface-container-lowest)/80 px-3 py-3">
                <input
                  type="checkbox"
                  checked={useAlfaLogo}
                  onChange={(e) => handleAlfaLogoToggle(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-(--ghost-outline) text-(--secondary) focus:ring-(--secondary)"
                />
                <span className="text-sm leading-snug text-on-surface">
                  <span className="font-semibold text-(--primary)">Alfa Emlak 3D logosunu kullan</span>
                  <span className="mt-1 block text-xs text-(--on-surface)/55">Önceden yüklenmiş site logosu kapak olarak atanır.</span>
                </span>
              </label>

              <div className={`mt-4 ${useAlfaLogo ? "pointer-events-none opacity-45" : ""}`}>
                <label
                  className={`inline-flex w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-(--ghost-outline) bg-white px-4 py-3 text-sm font-semibold text-(--primary) transition hover:bg-(--surface-container-lowest) ${uploadingCover ? "pointer-events-none opacity-60" : ""}`}
                >
                  <input type="file" accept="image/*,.heic,.heif,.avif" className="sr-only" onChange={handleCoverFile} disabled={uploadingCover || useAlfaLogo} />
                  {uploadingCover ? "Yükleniyor..." : "Bilgisayardan görsel seç"}
                </label>
                {uploadError ? <p className="mt-2 text-xs text-rose-600">{uploadError}</p> : null}
              </div>

              {coverPreviewSrc ? (
                <div className="relative mt-4 aspect-[16/9] w-full overflow-hidden rounded-xl border border-(--ghost-outline) bg-zinc-100">
                  {showLocalPreview ? (
                    <Image src={coverPreviewSrc} alt="Kapak önizleme" fill className="object-contain p-2" sizes="400px" unoptimized />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- harici Supabase URL
                    <img src={coverPreviewSrc} alt="Kapak önizleme" className="h-full w-full object-contain p-2" />
                  )}
                </div>
              ) : (
                <p className="mt-3 text-xs text-(--on-surface)/45">Kapak seçilmedi; yayında kartta görsel olmayabilir.</p>
              )}
            </div>

            <div>
              <label className="label-sm mb-1 block text-(--on-surface)/50">Yazar</label>
              <input className={inputCls} value={data.authorName} onChange={(e) => set("authorName", e.target.value)} placeholder="Ad Soyad" />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !data.title.trim() || !data.content.trim()}
            className="w-full rounded-xl bg-(--secondary) py-3 text-sm font-bold text-white shadow-md transition hover:opacity-90 disabled:opacity-40"
          >
            {saving ? "Kaydediliyor..." : initial ? "Güncelle" : "Yayınla"}
          </button>
        </div>
      </div>
    </div>
  );
}
