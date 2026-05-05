"use client";

import { useState } from "react";
import Image from "next/image";

type Props = {
  initialLogo: string;
};

export function OfficeLogoUploadField({ initialLogo }: Props) {
  const [logoUrl, setLogoUrl] = useState(initialLogo);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Logo yüklenemedi.");
      }
      setLogoUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo yüklenirken bir hata oluştu.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <label className="block text-sm">
      Ofis Logo (dosya yükle)
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className={`cursor-pointer rounded-xl bg-zinc-800 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-900 ${uploading ? "pointer-events-none opacity-60" : ""}`}>
          <input type="file" accept="image/*,.heic,.heif,.avif" className="sr-only" onChange={onLogoUpload} disabled={uploading} />
          {uploading ? "Yükleniyor..." : "Logo Seç"}
        </label>
        <input
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="/alfa-3d.png veya https://..."
          className="min-w-[260px] flex-1 rounded-xl border border-(--ghost-outline) bg-(--surface) px-3 py-2 text-sm outline-none focus:border-(--secondary) focus:ring-2 focus:ring-(--secondary)/20"
        />
      </div>
      <input type="hidden" name="dc_logo" value={logoUrl} />
      {logoUrl ? (
        <div className="mt-2 relative h-16 w-16 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
          <Image src={logoUrl} alt="Ofis logosu önizleme" fill className="object-cover" sizes="64px" unoptimized />
        </div>
      ) : null}
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
      <p className="mt-1 text-xs text-zinc-500">Kaydet butonuna basınca bu logo ofis logosu olarak kullanılır.</p>
    </label>
  );
}

