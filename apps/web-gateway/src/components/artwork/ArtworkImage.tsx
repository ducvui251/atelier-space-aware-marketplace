import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArtworkImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
}

/**
 * next/image errors on an empty src, and the catalog read path can return
 * imageUrl: "" for an artwork with no persisted image row — render an
 * explicit placeholder instead of letting that reach <Image>.
 */
export function ArtworkImage({ src, alt, fill, priority, sizes, className }: ArtworkImageProps) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          fill ? "absolute inset-0" : "h-full w-full",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-1.5 text-caption">
          <ImageOff className="size-6" aria-hidden />
          <span>No image</span>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      priority={priority}
      sizes={sizes}
      className={className}
    />
  );
}
