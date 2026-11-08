"use client";
// Photo gallery (FR-15: designed fallback, no layout shift).
// Showcase spin = Tier 1 (CSS 3D tilt, GPU compositor only) + Tier 2
// (drag cycles through the photos this car actually owns). Zero new bytes.
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import { CarFront, ChevronLeft, ChevronRight, MoveHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const DRAG_STEP_PX = 70; // px of horizontal drag = one photo advance
const MAX_TILT_DEG = 12; // clamp the tilt so it stays classy, never gimmicky

const mod = (n: number, m: number) => ((n % m) + m) % m;
const clampTilt = (deg: number) => Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, deg));

export function PhotoGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const [tilt, setTilt] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const startIdx = useRef(0);

  const list = photos.length ? photos : [];
  const spinnable = list.length > 1; // a 1-photo car stays honest: no fake affordances

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!spinnable || e.button !== 0) return;
    // Pointer capture: keep receiving moves even if the finger/cursor
    // leaves the photo — the drag never "drops" mid-rotation.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
    startX.current = e.clientX;
    startIdx.current = idx;
    setDragging(true);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (startX.current === null) return;
    const delta = e.clientX - startX.current;
    setTilt(clampTilt(delta * 0.08)); // drag distance -> degrees of tilt
    const steps = Math.round(delta / DRAG_STEP_PX);
    const next = mod(startIdx.current + steps, list.length);
    if (next !== idx) setIdx(next);
  }

  function endDrag() {
    startX.current = null;
    setDragging(false);
    setTilt(0); // spring back — the transform transition handles the ease
  }

  const step = (dir: 1 | -1) => spinnable && setIdx((i) => mod(i + dir, list.length));

  return (
    <div className="space-y-2">
      <div
        role="group"
        aria-label={spinnable ? `${alt} — drag horizontally to rotate through ${list.length} photos` : alt}
        className={cn(
          "group relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-muted",
          spinnable && "cursor-grab touch-pan-y select-none active:cursor-grabbing"
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* Tier 1: only `transform` changes -> runs on the GPU compositor.
            No JS per frame, no layout, no repaint. The cheapest 3D on the web. */}
        <div
          className="absolute inset-0"
          style={{
            transform: `perspective(1200px) rotateY(${tilt}deg)`,
            transition: dragging ? "none" : "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        >
          {/* Tier 2: every photo stays mounted (your cars have 1-3 photos),
              so cycling is instant — no flash while the next angle loads.
              The stack doubles as free preloading of every angle. */}
          {list.map((p, i) => (
            <div
              key={p + i}
              aria-hidden={i !== idx}
              className={cn("absolute inset-0 transition-opacity duration-300", i === idx ? "opacity-100" : "opacity-0")}
            >
              {!failed[i] ? (
                <Image
                  src={p}
                  alt={i === idx ? alt : ""}
                  fill
                  draggable={false}
                  sizes="(max-width: 768px) 100vw, 60vw"
                  priority={i === 0}
                  className="object-cover"
                  onError={() => setFailed((f) => ({ ...f, [i]: true }))}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <CarFront className="h-16 w-16 text-muted-foreground/30" aria-label={alt} />
                </div>
              )}
            </div>
          ))}
        </div>

        {spinnable && (
          <>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 text-foreground shadow-sm backdrop-blur transition hover:bg-background focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => step(1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 text-foreground shadow-sm backdrop-blur transition hover:bg-background focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
            <div className="pointer-events-none absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-xs text-foreground/80 shadow-sm backdrop-blur">
              <MoveHorizontal className="h-3.5 w-3.5" aria-hidden /> Drag to rotate
            </div>
          </>
        )}
      </div>

      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {list.map((p, i) => (
            <button
              key={p + i}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`Photo ${i + 1} of ${list.length}`}
              aria-current={i === idx}
              className={cn("relative h-16 w-24 shrink-0 overflow-hidden rounded-md border-2", i === idx ? "border-brand" : "border-transparent opacity-70 hover:opacity-100")}
            >
              {!failed[i] ? (
                <Image src={p} alt="" fill sizes="96px" className="object-cover" onError={() => setFailed((f) => ({ ...f, [i]: true }))} />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-muted"><CarFront className="h-5 w-5 text-muted-foreground/40" /></span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
