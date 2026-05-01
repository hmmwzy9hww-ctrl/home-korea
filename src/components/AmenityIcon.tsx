import * as Lucide from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Renders an amenity icon. If `iconUrl` is provided (admin-uploaded image),
 * it's rendered as an <img>. Otherwise we look up `iconName` from the
 * lucide-react icon set. Falls back to the `Sparkles` icon.
 */
export function AmenityIcon({
  iconUrl,
  iconName,
  className = "h-4 w-4",
  alt = "",
}: {
  iconUrl?: string;
  iconName?: string;
  className?: string;
  alt?: string;
}) {
  if (iconUrl && iconUrl.trim()) {
    return (
      <img
        src={iconUrl}
        alt={alt}
        className={`${className} object-contain`}
        loading="lazy"
        decoding="async"
      />
    );
  }
  const lib = Lucide as unknown as Record<string, LucideIcon>;
  const Icon: LucideIcon = (iconName && lib[iconName]) || Lucide.Sparkles;
  return <Icon className={className} aria-hidden="true" />;
}
