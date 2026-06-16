"use client";

import { useState, useEffect, useRef } from "react";
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
  const [current, setCurrent] = useState(0);
  const safePrimaryImage = primaryImage || "/placeholder-property.svg";
  const stageRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const validImages = images.filter((img) => img.url && typeof img.url === "string");
  const main = validImages[0];
  const thumbs = validImages.slice(1, 5);

  const displayImages = validImages.length > 0 ? validImages : [{ id: "primary", url: safePrimaryImage }];
  const total = displayImages.length;

  const goPrev = () => setCurrent((c) => (c - 1 + total) % total);
  const goNext = () => setCurrent((c) => (c + 1) % total);

  const handleOpen = (index = 0) => {
    setCurrent(Math.min(Math.max(index, 0), total - 1));
    setIsOpen(true);
  };
  const handleClose = () => {
    if (typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen?.();
    }
    setIsOpen(false);
  };

  const toggleFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // Esc / ok tuşları ve arka plan kaydırmayı engelleme
  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Tam ekrandaysa önce tarayıcı tam ekrandan çıkar; galeriyi kapatma.
        if (document.fullscreenElement) return;
        setIsOpen(false);
      } else if (e.key === "ArrowLeft") {
        goPrev();
      } else if (e.key === "ArrowRight") {
        goNext();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, total]);

  return (
    <>
      <div className="mt-8 grid gap-3 lg:grid-cols-12 lg:gap-4">
        <div
          className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-t-3xl rounded-b-2xl bg-surface-low lg:col-span-7 lg:aspect-auto lg:min-h-[420px]"
          onClick={() => handleOpen(0)}
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
              onClick={() => handleOpen(i + 1)}
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
          onClick={() => handleOpen(0)}
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
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              aria-label="Geri"
              className="flex shrink-0 items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25 transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Geri
            </button>
            <h3 id="photo-gallery-title" className="font-headline text-base font-bold text-white sm:text-lg">
              {current + 1} / {total}
            </h3>
            <span className="w-[72px] shrink-0 sm:w-[88px]" aria-hidden />
          </div>

          {/* Kaydırmalı görüntüleyici */}
          <div
            ref={stageRef}
            className="relative flex flex-1 items-center justify-center overflow-hidden px-2 py-2 sm:px-16"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current == null) return;
              const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
              if (Math.abs(dx) > 40) {
                if (dx < 0) goNext();
                else goPrev();
              }
              touchStartX.current = null;
            }}
          >
            {total > 1 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                aria-label="Önceki fotoğraf"
                className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/15 p-3 text-white hover:bg-white/30 transition sm:flex"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            ) : null}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              aria-label="Fotoğrafı tam ekran yap"
              className="relative h-full w-full max-w-6xl cursor-zoom-in"
            >
              <Image
                key={displayImages[current]?.id || current}
                src={displayImages[current]?.url || safePrimaryImage}
                alt={`Photo ${current + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                unoptimized
                priority
              />
            </button>

            {total > 1 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                aria-label="Sonraki fotoğraf"
                className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/15 p-3 text-white hover:bg-white/30 transition sm:flex"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            ) : null}
          </div>

          {/* Alt küçük resim şeridi */}
          {total > 1 ? (
            <div
              className="flex shrink-0 justify-center gap-2 overflow-x-auto border-t border-white/10 bg-black/85 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
            >
              {displayImages.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => setCurrent(idx)}
                  aria-label={`Fotoğraf ${idx + 1}`}
                  aria-current={idx === current}
                  className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg ring-2 transition ${
                    idx === current ? "ring-white" : "ring-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={img.url || safePrimaryImage}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
