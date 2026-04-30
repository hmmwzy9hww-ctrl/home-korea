import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoCarouselProps {
  photos: string[];
  alt?: string;
  className?: string;
  rounded?: boolean;
}

export function PhotoCarousel({ photos, alt = "", className, rounded = true }: PhotoCarouselProps) {
  const [idx, setIdx] = useState(0);
  const safe = photos.length > 0 ? photos : ["https://placehold.co/800x600?text=No+photo"];
  const next = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIdx((i) => (i + 1) % safe.length);
  };
  const prev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIdx((i) => (i - 1 + safe.length) % safe.length);
  };

  return (
    <div className={cn("relative w-full aspect-[4/3] overflow-hidden bg-muted", rounded && "rounded-xl", className)}>
      <img
        src={safe[idx]}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
      {safe.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Prev"
            className="absolute left-2 top-1/2 -translate-y-1/2 grid place-items-center h-8 w-8 rounded-full bg-background/80 backdrop-blur shadow-card hover:bg-background"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next"
            className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center h-8 w-8 rounded-full bg-background/80 backdrop-blur shadow-card hover:bg-background"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {safe.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === idx ? "w-4 bg-white" : "w-1.5 bg-white/60",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
