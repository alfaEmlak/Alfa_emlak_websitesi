"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { saveAgent } from "@/app/karealfaadmin/module-actions";

type Props = {
  agent?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    photo: string | null;
    title: string | null;
    role: string;
    is_active: boolean;
  } | null;
};

export function AgentEditor({ agent }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [form, setForm] = useState({
    id: agent?.id ?? "",
    name: agent?.name ?? "",
    email: agent?.email ?? "",
    phone: agent?.phone ?? "",
    photo: agent?.photo ?? "",
    title: agent?.title ?? "Emlak Danışmanı",
    role: agent?.role ?? "AGENT",
    password: "",
    is_active: agent?.is_active ?? true,
  });

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.url) {
        set("photo", data.url);
      } else {
        throw new Error(data.error || "Yükleme başarısız");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Yükleme hatası");
      setMessageType("error");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      setMessage(null);
      
      if (!form.name.trim()) {
        setMessage("Ad gerekli");
        setMessageType("error");
        return;
      }
      if (!form.email.trim()) {
        setMessage("E-posta gerekli");
        setMessageType("error");
        return;
      }
      if (!agent && !form.password) {
        setMessage("Yeni danışman için şifre gerekli");
        setMessageType("error");
        return;
      }

      try {
        await saveAgent({
          id: form.id || undefined,
          name: form.name,
          email: form.email,
          password: form.password || undefined,
          phone: form.phone,
          photo: form.photo,
          title: form.title,
          role: form.role,
        });
        
        setMessage(agent ? "Danışman güncellendi" : "Danışman oluşturuldu");
        setMessageType("success");
        router.refresh();
        setTimeout(() => router.push("/karealfaadmin/danismanlar"), 1500);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Kayıt hatası");
        setMessageType("error");
      }
    });
  }

  return (
    <div className="p-6 lg:p-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold">{agent ? "Danışman Düzenle" : "Yeni Danışman"}</h1>
          <p className="mt-1 text-sm text-zinc-500">Danışman bilgilerini girin</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/karealfaadmin/danismanlar")}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          İptal
        </button>
      </div>

      {message && (
        <div className={`rounded-xl p-4 mb-6 ${messageType === "success" ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
          <p className={`text-sm font-semibold ${messageType === "success" ? "text-emerald-800" : "text-red-800"}`}>{message}</p>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Fotoğraf Yükleme */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-2">Danışman Fotoğrafı</label>
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-zinc-200 bg-zinc-100">
                {form.photo ? (
                  <Image src={form.photo} alt="" fill className="object-cover" sizes="96px" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label className="cursor-pointer rounded-xl bg-zinc-800 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-900 text-center">
                  <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoUpload} disabled={uploading} />
                  {uploading ? "Yükleniyor..." : "Fotoğraf Yükle"}
                </label>
                <input
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  placeholder="veya URL girin"
                  value={form.photo}
                  onChange={(e) => set("photo", e.target.value)}
                />
              </div>
            </div>
          </div>

          <label className="block text-sm font-medium text-zinc-700">
            Ad Soyad *
            <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            E-posta *
            <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            Telefon
            <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            Ünvan
            <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Emlak Danışmanı" />
          </label>

          {!agent && (
            <label className="block text-sm font-medium text-zinc-700">
              Şifre *
              <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} />
            </label>
          )}

          <label className="block text-sm font-medium text-zinc-700">
            Rol
            <select className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.role} onChange={(e) => set("role", e.target.value)}>
              <option value="AGENT">Danışman</option>
              <option value="ADMIN">Yönetici</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500/20" />
            Aktif
          </label>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending || uploading}
            className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/25 disabled:opacity-50 hover:bg-emerald-700"
          >
            {pending ? "Kaydediliyor..." : agent ? "Güncelle" : "Oluştur"}
          </button>
        </div>
      </div>
    </div>
  );
}
