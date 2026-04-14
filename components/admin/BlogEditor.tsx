"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveBlogPost } from "@/app/karealfaadmin/module-actions";

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
    }
  );

  function autoSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[ğ]/g, "g").replace(/[ü]/g, "u").replace(/[ş]/g, "s")
      .replace(/[ı]/g, "i").replace(/[ö]/g, "o").replace(/[ç]/g, "c")
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

  async function handleSave() {
    setSaving(true);
    try {
      await saveBlogPost(data);
      router.push("/karealfaadmin/blog");
      router.refresh();
    } catch (e) {
      alert("Hata: " + (e instanceof Error ? e.message : "Bilinmeyen hata"));
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-(--ghost-outline) bg-(--surface-container-lowest) px-3 py-2.5 text-sm text-on-surface placeholder:text-(--on-surface)/30 focus:border-(--secondary) focus:outline-none focus:ring-2 focus:ring-(--secondary)/20";

  return (
    <div className="p-6 lg:p-10">
      <h1 className="admin-page-title text-3xl font-extrabold">
        {initial ? "Blog Yazısı Düzenle" : "Yeni Blog Yazısı"}
      </h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Main */}
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
              <textarea className={inputCls} rows={2} value={data.excerpt} onChange={(e) => set("excerpt", e.target.value)} placeholder="Kısa özet (listelemelerde gözükür)" />
            </div>
            <div>
              <label className="label-sm mb-1 block text-(--on-surface)/50">İçerik (Markdown/HTML)</label>
              <textarea className={inputCls} rows={12} value={data.content} onChange={(e) => set("content", e.target.value)} placeholder="Blog yazısını buraya girin..." />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="admin-card space-y-4 p-5">
            <div>
              <label className="label-sm mb-1 block text-(--on-surface)/50">Durum</label>
              <select className={inputCls} value={data.status} onChange={(e) => set("status", e.target.value)}>
                <option value="DRAFT">Taslak</option>
                <option value="PUBLISHED">Yayınla</option>
              </select>
            </div>
            <div>
              <label className="label-sm mb-1 block text-(--on-surface)/50">Kapak Görseli (URL)</label>
              <input className={inputCls} value={data.coverImage} onChange={(e) => set("coverImage", e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label className="label-sm mb-1 block text-(--on-surface)/50">Yazar</label>
              <input className={inputCls} value={data.authorName} onChange={(e) => set("authorName", e.target.value)} placeholder="Ad Soyad" />
            </div>
          </div>

          <button
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
