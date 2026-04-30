import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Facebook-style 5-photo grid: 1 large left + 4 small right (2x2).
// More photos collapse into a "+N" overlay on the last tile.
// Clicking any tile opens a lightbox.
export function PhotoGrid({ photos, alt = "" }: { photos: string[]; alt?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const safe = photos.filter(Boolean);
  if (!safe.length) {
    return (
      <div className="aspect-[16/9] w-full grid place-items-center bg-muted text-muted-foreground text-sm">
        No photos
      </div>
    );
  }

  const display = safe.slice(0, 5);
  const remaining = Math.max(0, safe.length - 5);

  if (display.length === 1) {
    return (
      <>
        <button type="button" onClick={() => setOpen(0)} className="block w-full">
          <img src={display[0]} alt={alt} className="aspect-[16/9] w-full object-cover" />
        </button>
        {open !== null && <Lightbox photos={safe} index={open} onClose={() => setOpen(null)} setIndex={setOpen} />}
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-1 aspect-[16/10] w-full bg-background">
        <button
          type="button"
          onClick={() => setOpen(0)}
          className="relative overflow-hidden bg-muted"
        >
          <img src={display[0]} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
        </button>
        <div className={cn("grid gap-1", display.length >= 3 ? "grid-rows-2" : "grid-rows-1", display.length >= 4 ? "grid-cols-2" : "grid-cols-1")}>
          {display.slice(1).map((src, i) => {
            const idx = i + 1;
            const isLast = idx === display.length - 1;
            const overlay = isLast && remaining > 0;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setOpen(idx)}
                className="relative overflow-hidden bg-muted"
              >
                <img src={src} alt={`${alt} ${idx + 1}`} className="absolute inset-0 h-full w-full object-cover" />
                {overlay && (
                  <span className="absolute inset-0 grid place-items-center bg-foreground/55 text-background text-xl font-bold">
                    +{remaining}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {open !== null && <Lightbox photos={safe} index={open} onClose={() => setOpen(null)} setIndex={setOpen} />}
    </>
  );
}

function Lightbox({
  photos,
  index,
  setIndex,
  onClose,
}: {
  photos: string[];
  index: number;
  setIndex: (i: number) => void;
  onClose: () => void;
}) {
  const prev = () => setIndex((index - 1 + photos.length) % photos.length);
  const next = () => setIndex((index + 1) % photos.length);
  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
            aria-label="Prev"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
      <img
        src={photos[index]}
        alt=""
        className="max-h-[90vh] max-w-[92vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-xs">
        {index + 1} / {photos.length}
      </div>
    </div>
  );
}
