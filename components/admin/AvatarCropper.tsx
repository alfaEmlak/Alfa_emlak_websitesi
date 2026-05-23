"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  imageSrc: string;
  onCrop: (croppedBlob: Blob) => void;
  onCancel: () => void;
  uploading?: boolean;
};

export function AvatarCropper({ imageSrc, onCrop, onCancel, uploading = false }: Props) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [baseSize, setBaseSize] = useState({ width: 0, height: 0 });

  // Calculate base size to cover a 300x300 viewport
  useEffect(() => {
    const img = new window.Image();
    img.src = imageSrc;
    img.onload = () => {
      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;
      setImageSize({ width: imgWidth, height: imgHeight });

      const scaleMin = Math.min(300 / imgWidth, 300 / imgHeight);
      setBaseSize({
        width: imgWidth * scaleMin,
        height: imgHeight * scaleMin,
      });
      setPosition({ x: 0, y: 0 });
      setZoom(1);
    };
  }, [imageSrc]);

  // Touch and Mouse handlers for dragging
  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStart.current = { x: clientX - position.x, y: clientY - position.y };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const newX = clientX - dragStart.current.x;
    const newY = clientY - dragStart.current.y;
    setPosition({ x: newX, y: newY });
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleCropSubmit = () => {
    const img = new window.Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 400x400 is the final high-res output size
      canvas.width = 400;
      canvas.height = 400;

      ctx.clearRect(0, 0, 400, 400);
      const ratio = 400 / 300;

      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;
      const scaleMin = Math.min(300 / imgWidth, 300 / imgHeight);
      
      const drawWidth = imgWidth * scaleMin * zoom * ratio;
      const drawHeight = imgHeight * scaleMin * zoom * ratio;

      const centerX = 200 + position.x * ratio;
      const centerY = 200 + position.y * ratio;

      ctx.drawImage(
        img,
        centerX - drawWidth / 2,
        centerY - drawHeight / 2,
        drawWidth,
        drawHeight
      );

      canvas.toBlob(
        (blob) => {
          if (blob) {
            onCrop(blob);
          }
        },
        "image/jpeg",
        0.9
      );
    };
  };

  const renderedWidth = baseSize.width * zoom;
  const renderedHeight = baseSize.height * zoom;

  const left = 150 + position.x - renderedWidth / 2;
  const top = 150 + position.y - renderedHeight / 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-zinc-800">Fotoğrafı Ayarla</h3>
          <p className="text-xs text-zinc-500">
            Fotoğrafı sürükleyerek daire içine hizalayabilir ve aşağıdaki kaydırıcıyla yakınlaştırabilirsiniz.
          </p>
        </div>

        {/* Viewport Container */}
        <div className="flex justify-center my-6">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleEnd}
            className="relative h-[300px] w-[300px] cursor-move overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-900 select-none touch-none"
          >
            {/* Renders the scaled/translated image */}
            {imageSrc && (
              <img
                src={imageSrc}
                alt="Reposition"
                draggable={false}
                style={{
                  width: renderedWidth,
                  height: renderedHeight,
                  position: "absolute",
                  left,
                  top,
                  userSelect: "none",
                  pointerEvents: "none",
                  maxWidth: "none",
                }}
              />
            )}

            {/* Premium circular cutout mask overlay */}
            <div className="absolute inset-0 pointer-events-none rounded-full ring-[9999px] ring-black/55 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] border-2 border-emerald-500/80" />
          </div>
        </div>

        {/* Scale/Zoom Control */}
        <div className="mb-6">
          <label className="flex items-center justify-between text-xs font-semibold text-zinc-600 mb-2">
            <span>Yakınlaştır / Uzaklaştır</span>
            <span>{Math.round(zoom * 100)}%</span>
          </label>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-emerald-600 outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={uploading}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleCropSubmit}
            disabled={uploading}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Yükleniyor...
              </>
            ) : (
              "Kırp ve Kaydet"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
