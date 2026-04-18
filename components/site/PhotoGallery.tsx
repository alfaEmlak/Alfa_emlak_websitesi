"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

type PhotoGalleryProps = {
  images: { id: string; url: string }[];
  primaryImage: string;
  badgeVirtualTour?: boolean;
  virtualTourEnabled?: boolean;
};

export function PhotoGallery({
  images,
  primaryImage,
  badgeVirtualTour,
  virtualTourEnabled,
}: PhotoGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const safePrimaryImage = primaryImage || "/placeholder-property.svg";

  // Esc tuşu ile kapatma ve arka plan kaydırmayı engelleme
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setIsOpen(false);
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        document.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen]);

  const validImages = images.filter((img) => img.url && typeof img.url === "string");
  const main = validImages[0];
  const thumbs = validImages.slice(1, 5);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const displayImages = validImages.length > 0 ? validImages : [{ id: "primary", url: safePrimaryImage }];

  return (
    <>
      <div className="mt-8 grid gap-3 lg:grid-cols-12 lg:gap-4">
        <div
          className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-t-3xl rounded-b-2xl bg-surface-low lg:col-span-7 lg:aspect-auto lg:min-h-[420px]"
          onClick={handleOpen}
        >
          {main && main.url ? (
            <Image
              src={main.url}
              alt=""
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width:1024px) 100vw, 58vw"
              priority
            />
          ) : (
            <Image
              src={safePrimaryImage}
              alt=""
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width:1024px) 100vw, 58vw"
              priority
            />
          )}
          {badgeVirtualTour && virtualTourEnabled ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/25">
              <div className="flex flex-col items-center rounded-xl bg-black/50 px-6 py-4 text-white backdrop-blur-sm">
                <span className="text-3xl">▶</span>
                <span className="mt-1 text-sm font-semibold">360° Sanal Tur</span>
              </div>
            </div>
          ) : null}
          <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:col-span-5 lg:grid-cols-2 lg:grid-rows-2">
          {thumbs.map((img, i) => (
            <div
              key={img.id || i}
              className={`group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-xl bg-surface-low ${
                i === 1 && badgeVirtualTour ? "ring-2 ring-secondary" : ""
              }`}
              onClick={handleOpen}
            >
              <Image
                src={img.url || safePrimaryImage}
                alt=""
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width:1024px) 50vw, 20vw"
              />
              {i === 1 && badgeVirtualTour ? (
                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                  360°
                </span>
              ) : null}
              <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <button
          type="button"
          onClick={handleOpen}
          className="text-sm font-semibold text-secondary hover:underline"
        >
          Tüm fotoğrafları göster
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-surface p-4 sm:p-8 animate-in fade-in duration-300">
          <div className="mx-auto flex w-full max-w-5xl justify-between pb-4">
            <h3 className="font-headline text-lg font-bold text-primary">Fotoğraf Galerisi</h3>
            <button
              onClick={handleClose}
              className="flex items-center justify-center rounded-full bg-surface-high p-2 text-primary hover:bg-surface-highest hover:text-secondary transition"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-x-auto overflow-y-hidden snap-x snap-mandatory flex items-center md:items-start md:overflow-y-auto md:overflow-x-hidden md:flex-col md:pb-10 no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div className="flex flex-row md:flex-col gap-4 sm:gap-10 md:mx-auto md:max-w-4xl px-4 md:px-0">
              {displayImages.map((img, idx) => (
                <div key={img.id || idx} className="snap-center shrink-0 relative w-[85vw] md:w-full shadow-lg rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-[16/9] lg:aspect-[3/2]">
                  <Image 
                    src={img.url || safePrimaryImage} 
                    alt={`Photo ${idx + 1}`} 
                    fill 
                    className="object-cover" 
                    sizes="(max-width:1200px) 100vw, 1200px" 
                    unoptimized 
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
