"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { saveSliderSettings } from "./actions";

export function SliderSettingsForm({ initialData }: { initialData: { images: string[]; interval: number } }) {
  const router = useRouter();
  const [images, setImages] = useState<string[]>(initialData.images || []);
  const [intervalSec, setIntervalSec] = useState<number>((initialData.interval || 5000) / 1000);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", e.target.files[0]);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Yükleme başarısız");
      }

      const data = await res.json();
      setImages([...images, data.url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setUploading(false);
      e.target.value = ""; // Reset input
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    const temp = newImages[index - 1];
    newImages[index - 1] = newImages[index];
    newImages[index] = temp;
    setImages(newImages);
  };

  const handleMoveDown = (index: number) => {
    if (index === images.length - 1) return;
    const newImages = [...images];
    const temp = newImages[index + 1];
    newImages[index + 1] = newImages[index];
    newImages[index] = temp;
    setImages(newImages);
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await saveSliderSettings(images, intervalSec * 1000);
      router.refresh();
      alert("Ayarlar başarıyla kaydedildi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydetme başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 bg-white p-6 rounded-lg border shadow-sm max-w-4xl">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">
          Geçiş Süresi (Saniye)
        </label>
        <input
          type="number"
          min="1"
          step="0.5"
          value={intervalSec}
          onChange={(e) => setIntervalSec(parseFloat(e.target.value) || 5)}
          className="w-full sm:w-64 border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        <p className="mt-1 text-xs text-zinc-500">Resimler arası bekleme süresi.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">
          Slider Görselleri
        </label>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {images.map((url, i) => (
            <div key={`${url}-${i}`} className="relative group rounded-md overflow-hidden border bg-zinc-100 aspect-video">
              <Image 
                src={url} 
                alt={`Slider Image ${i + 1}`} 
                fill 
                className="object-cover" 
              />
              
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <div className="flex justify-between">
                  <button 
                    onClick={() => handleMoveUp(i)} 
                    disabled={i === 0}
                    className="p-1.5 bg-white/20 hover:bg-white/40 rounded disabled:opacity-30 text-white"
                    title="Yukarı Taşı"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => handleMoveDown(i)} 
                    disabled={i === images.length - 1}
                    className="p-1.5 bg-white/20 hover:bg-white/40 rounded disabled:opacity-30 text-white"
                    title="Aşağı Taşı"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                
                <button 
                  onClick={() => handleRemoveImage(i)}
                  className="w-full py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}

          {/* Upload Button */}
          <label className="relative cursor-pointer rounded-md border-2 border-dashed border-zinc-300 bg-zinc-50 hover:bg-zinc-100 aspect-video flex flex-col items-center justify-center transition-colors">
            {uploading ? (
              <span className="text-sm font-medium text-zinc-500">Yükleniyor...</span>
            ) : (
              <>
                <svg className="w-8 h-8 text-zinc-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm font-medium text-zinc-600">Yeni Resim Ekle</span>
              </>
            )}
            <input 
              type="file" 
              accept="image/*" 
              className="sr-only" 
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
        <p className="text-xs text-zinc-500">Önerilen boyut: 1920x1080 piksel (16:9). Sıralamayı oklarla değiştirebilirsiniz.</p>
      </div>

      <div className="pt-6 border-t">
        <button
          onClick={handleSave}
          disabled={loading || uploading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors disabled:opacity-50"
        >
          {loading ? "Kaydediliyor..." : "Ayarları Kaydet"}
        </button>
      </div>
    </div>
  );
}
