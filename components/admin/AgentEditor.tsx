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
    title: agent?.title ?? "Emlak Danismani",
    role: agent?.role ?? "CONSULTANT",
    password: "",
    is_active: agent?.is_active ?? true,
  });

  const set = (key: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

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
      const data = (await res.json()) as { url?: string; error?: string };

      if (data.url) {
        set("photo", data.url);
      } else {
        throw new Error(data.error || "Yukleme basarisiz");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Yukleme hatasi");
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
        setMessage("Yeni danisman icin sifre gerekli");
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

        setMessage(agent ? "Danisman guncellendi" : "Danisman olusturuldu");
        setMessageType("success");
        router.refresh();
        setTimeout(() => router.push("/karealfaadmin/danismanlar"), 1200);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Kayit hatasi");
        setMessageType("error");
      }
    });
  }

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">{agent ? "Danisman Duzenle" : "Yeni Danisman"}</h1>
          <p className="mt-1 text-sm text-zinc-500">Danisman bilgilerini girin</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/karealfaadmin/danismanlar")}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Iptal
        </button>
      </div>

      {message ? (
        <div className={`mb-6 rounded-xl border p-4 ${messageType === "success" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
          <p className={`text-sm font-semibold ${messageType === "success" ? "text-emerald-800" : "text-red-800"}`}>{message}</p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-zinc-700">Danisman Fotografi</label>
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-zinc-200 bg-zinc-100">
                {form.photo ? (
                  <Image src={form.photo} alt="" fill className="object-cover" sizes="96px" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-400">
                    <span className="text-3xl">+</span>
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <label className="cursor-pointer rounded-xl bg-zinc-800 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-zinc-900">
                  <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoUpload} disabled={uploading} />
                  {uploading ? "Yukleniyor..." : "Fotograf Yukle"}
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
            Unvan
            <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Emlak Danismani" />
          </label>

          {!agent ? (
            <label className="block text-sm font-medium text-zinc-700">
              Sifre *
              <input className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} />
            </label>
          ) : null}

          <label className="block text-sm font-medium text-zinc-700">
            Rol
            <select className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" value={form.role} onChange={(e) => set("role", e.target.value)}>
              <option value="CONSULTANT">Danisman</option>
              <option value="ADMIN">Yonetici</option>
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
            {pending ? "Kaydediliyor..." : agent ? "Guncelle" : "Olustur"}
          </button>
        </div>
      </div>
    </div>
  );
}
