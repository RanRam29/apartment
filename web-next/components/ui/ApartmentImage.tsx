"use client";

import { useEffect, useState } from "react";
import type { ApartmentImageRef } from "@/lib/apartment-images";
import { getApartmentImageUrls } from "@/lib/apartment-images";

interface ApartmentImageProps {
  images: ApartmentImageRef[] | null | undefined;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

export function ApartmentImageFallback({ compact = false }: { compact?: boolean }) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-[#e8f5f0] via-surface-container to-[#dce8f4] flex flex-col items-center justify-center">
      <div
        className={`${compact ? "w-12 h-12" : "w-16 h-16"} rounded-2xl bg-white/70 flex items-center justify-center shadow-sm mb-2`}
      >
        <span className={`material-symbols-outlined ${compact ? "text-[28px]" : "text-[36px]"} text-landlord-green/60`}>
          apartment
        </span>
      </div>
      {!compact && (
        <span className="text-[12px] text-on-surface-variant/70 font-medium">תמונה בקרוב</span>
      )}
    </div>
  );
}

export function ApartmentImage({ images, alt, className, fallback }: ApartmentImageProps) {
  const urls = getApartmentImageUrls(images);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [images]);

  if (urls.length === 0 || index >= urls.length) {
    return <>{fallback ?? <ApartmentImageFallback />}</>;
  }

  return (
    <img
      src={urls[index]}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}
