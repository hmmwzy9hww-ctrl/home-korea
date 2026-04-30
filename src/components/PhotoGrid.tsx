import { useState } from "react";
import { cn } from "@/lib/utils";
import { PhotoLightbox } from "./PhotoLightbox";

interface PhotoGridProps {
  photos: string[];
  alt?: string;
  className?: string;
  /** Optional overlay nodes (e.g. badges, fav button) absolutely positioned over the grid */
  overlay?: React.ReactNode;
}

/**
 * Facebook-style photo grid:
 *  - 1 photo:  one large
 *  - 2 photos: large + 1 wide below
 *  - 3 photos: large + 2 side-by-side
 *  - 4 photos: large + 3 in a row below
 *  - 5+ photos: large + 2 + 2 with "+X more" overlay on the last cell
 */
export function PhotoGrid({ photos, alt = "", className, overlay }: PhotoGridProps) {
  const [open, setOpen] = useState(false);
  const [startIdx, setStartIdx] = useState(0);

  const safe = photos.length > 0 ? photos : ["https://placehold.co/800x600?text=No+photo"];

  const openAt = (i: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStartIdx(i);
    setOpen(true);
  };

  const Tile = ({
    src,
    index,
    aspect,
    moreCount,
  }: {
    src: string;
    index: number;
    aspect: string;
    moreCount?: number;
  }) => (
    <button
      type="button"
      onClick={openAt(index)}
      className={cn(
        "relative overflow-hidden bg-muted group/photo block w-full",
        aspect,
      )}
      aria-label={`Open photo ${index + 1}`}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/photo:scale-105"
      />
      {moreCount && moreCount > 0 ? (
        <div className="absolute inset-0 bg-black/55 grid place-items-center text-white font-semibold text-xl sm:text-2xl">
          +{moreCount}
        </div>
      ) : (
        <div className="absolute inset-0 bg-black/0 group-hover/photo:bg-black/10 transition-colors" />
      )}
    </button>
  );

  const n = safe.length;

  return (
    <>
      <div className={cn("relative", className)}>
        <div className="grid grid-cols-2 gap-1">
          {/* Main photo */}
          <div className="col-span-2">
            <Tile src={safe[0]} index={0} aspect="aspect-[16/10]" />
          </div>

          {n === 2 && (
            <div className="col-span-2">
              <Tile src={safe[1]} index={1} aspect="aspect-[16/7]" />
            </div>
          )}

          {n === 3 && (
            <>
              <Tile src={safe[1]} index={1} aspect="aspect-[4/3]" />
              <Tile src={safe[2]} index={2} aspect="aspect-[4/3]" />
            </>
          )}

          {n === 4 && (
            <>
              <Tile src={safe[1]} index={1} aspect="aspect-[4/3]" />
              <Tile src={safe[2]} index={2} aspect="aspect-[4/3]" />
              <div className="col-span-2">
                <Tile src={safe[3]} index={3} aspect="aspect-[16/7]" />
              </div>
            </>
          )}

          {n >= 5 && (
            <>
              <Tile src={safe[1]} index={1} aspect="aspect-[4/3]" />
              <Tile src={safe[2]} index={2} aspect="aspect-[4/3]" />
              <Tile src={safe[3]} index={3} aspect="aspect-[4/3]" />
              <Tile
                src={safe[4]}
                index={4}
                aspect="aspect-[4/3]"
                moreCount={n > 5 ? n - 5 : 0}
              />
            </>
          )}
        </div>

        {overlay}
      </div>

      <PhotoLightbox
        photos={safe}
        open={open}
        startIndex={startIdx}
        onClose={() => setOpen(false)}
        alt={alt}
      />
    </>
  );
}
