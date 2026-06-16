"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface Props {
  images: string[];
  interval?: number;
}

export function HeroSlider({ images, interval = 5000 }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!images || images.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, interval);
    
    return () => clearInterval(timer);
  }, [images, interval]);

  if (!images || images.length === 0) return null;

  return (
    <>
      {images.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt={`Slide ${index + 1}`}
          fill
          fetchPriority={index === 0 ? "high" : "auto"}
          loading={index === 0 ? "eager" : "lazy"}
          quality={75}
          className={`object-cover object-center transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
          sizes="100vw"
        />
      ))}
    </>
  );
}
