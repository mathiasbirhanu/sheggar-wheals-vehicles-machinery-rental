"use client";
// FR-15: car photos render with a designed fallback — never a broken-image icon.
import Image from "next/image";
import { useState } from "react";
import { CarFront } from "lucide-react";

export function CarImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className ?? ""}`} aria-label={alt} role="img">
        <CarFront className="h-10 w-10 text-muted-foreground/40" aria-hidden />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, 33vw"
      className={`object-cover ${className ?? ""}`}
      onError={() => setFailed(true)}
    />
  );
}
