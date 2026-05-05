"use client";

import { useState } from "react";
import Image from "next/image";
import { useFormStatus } from "react-dom";
import { saveMyConsultantProfile } from "@/app/karealfaadmin/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Kaydediliyor..." : "Kaydet"}
    </button>
  );
}

type Props = {
  initialName: string;
  initialPhone: string;
  initialPhoto: string;
  email: string;
};

export function ConsultantProfileForm({ initialName, initialPhone, initialPhoto, email }: Props) {
  const [photoUrl, setPhotoUrl] = useState(initialPhoto);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Fotoğraf yüklenemedi.");
      }
      setPhotoUrl(data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Fotoğraf yüklenemedi.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <form action={saveMyConsultantProfile} className="mt-8 max-w-2xl space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-800">Profil Bilgileri</h2>
        <p className="mt-1 text-sm text-zinc-500">Sitede nasıl görüneceğinizi buradan yönetebilirsiniz.</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-zinc-700">
            Görünür adınız
            <input
              name="name"
              defaultValue={initialName}
              required
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-700">
            Telefon numaranız
            <input
              name="phone"
              defaultValue={initialPhone}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-700 sm:col-span-2">
            E-posta
            <input
              value={email}
              readOnly
              disabled
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-600"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-800">Profil Fotoğrafı</h2>
        <p className="mt-1 text-sm text-zinc-500">Bilgisayarınızdan görsel seçip yükleyebilirsiniz.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className={`inline-flex cursor-pointer items-center justify-center rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-900 ${uploading ? "pointer-events-none opacity-60" : ""}`}>
            <input type="file" accept="image/*,.heic,.heif,.avif" className="sr-only" onChange={handleUpload} disabled={uploading} />
            {uploading ? "Yükleniyor..." : "Fotoğraf Seç"}
          </label>
          <input
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://... (opsiyonel)"
            className="min-w-[260px] flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
          <input type="hidden" name="photo" value={photoUrl} />
        </div>
        {photoUrl ? (
          <div className="mt-3 relative h-20 w-20 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
            <Image src={photoUrl} alt="Profil fotoğrafı" fill className="object-cover" sizes="80px" unoptimized />
          </div>
        ) : null}
        {uploadError ? <p className="mt-2 text-xs text-rose-600">{uploadError}</p> : null}
      </section>

      <SubmitButton />
    </form>
  );
}

