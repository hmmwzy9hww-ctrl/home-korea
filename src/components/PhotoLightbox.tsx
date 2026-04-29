import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoLightboxProps {
  photos: string[];
  open: boolean;
  startIndex?: number;
  onClose: () => void;
  alt?: string;
}

export function PhotoLightbox({ photos, open, startIndex = 0, onClose, alt = "" }: PhotoLightboxProps) {
  const [idx, setIdx] = useState(startIndex);

  useEffect(() => {
    if (open) setIdx(startIndex);
  }, [open, startIndex]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % photos.length);
      if (e.key === "ArrowLeft") setIdx((i) => (i - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, photos.length, onClose]);

  if (!open || photos.length === 0) return null;

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i + 1) % photos.length);
  };
  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i - 1 + photos.length) % photos.length);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
        className="absolute top-4 right-4 grid place-items-center h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="absolute top-4 left-4 text-white/80 text-sm font-medium">
        {idx + 1} / {photos.length}
      </div>

      <img
        src={photos[idx]}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[92vw] object-contain select-none"
      />

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous"
            className="absolute left-4 top-1/2 -translate-y-1/2 grid place-items-center h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next"
            className="absolute right-4 top-1/2 -translate-y-1/2 grid place-items-center h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-[90vw] overflow-x-auto px-2"
          >
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Go to photo ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === idx ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
