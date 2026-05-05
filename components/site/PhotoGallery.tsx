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
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="photo-gallery-title"
          className="fixed inset-0 z-[500] flex flex-col bg-black/95"
          onClick={handleClose}
        >
          {/* Sabit üst bar — site header (z-200) üstünde kalmalı; aksi halde kapatma görünmez */}
          <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/90 px-4 py-3 backdrop-blur-sm sm:px-6">
            <h3 id="photo-gallery-title" className="font-headline text-base font-bold text-white sm:text-lg">
              Fotoğraf Galerisi ({displayImages.length})
            </h3>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              aria-label="Galeriyi kapat"
              className="flex shrink-0 items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25 transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              Kapat
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto px-4 pb-24 pt-2 sm:px-8 sm:pb-28"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:gap-6">
              {displayImages.map((img, idx) => (
                <div
                  key={img.id || idx}
                  className="relative w-full overflow-hidden rounded-xl bg-black"
                  style={{ aspectRatio: "16 / 10" }}
                >
                  <Image
                    src={img.url || safePrimaryImage}
                    alt={`Photo ${idx + 1}`}
                    fill
                    className="object-contain"
                    sizes="(max-width:1024px) 100vw, 1024px"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Mobil ve masaüstünde her zaman görünen ikinci kapatma çubuğu */}
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[510] flex justify-center border-t border-white/10 bg-black/85 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="pointer-events-auto rounded-full bg-white px-8 py-3 text-sm font-bold text-black shadow-lg hover:bg-white/90"
            >
              Kapat — Esc
            </button>
          </div>
        </div>
      )}
    </>
  );
}
