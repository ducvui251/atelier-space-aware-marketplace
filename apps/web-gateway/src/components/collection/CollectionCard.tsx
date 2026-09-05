import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { Collection } from "@/types";
import { cn } from "@/lib/utils";

interface CollectionCardProps {
  collection: Collection;
  className?: string;
}

export function CollectionCard({ collection, className }: CollectionCardProps) {
  return (
    <Link
      href="/artworks"
      className={cn(
        "group focus-ring relative flex aspect-[4/5] w-full flex-col justify-end overflow-hidden rounded-lg bg-muted",
        className,
      )}
    >
      <Image
        src={collection.imageUrl}
        alt={collection.title}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover transition-transform duration-normal [transition-timing-function:var(--ease-out)] group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent" />
      <div className="relative p-5 text-surface">
        <p className="eyebrow text-surface/70">
          {collection.artworkCount} works
        </p>
        <div className="mt-1 flex items-center gap-2">
          <h3 className="font-display text-h3 text-surface">
            {collection.title}
          </h3>
          <ArrowUpRight className="size-4 text-surface/80 transition-transform duration-normal group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
        <p className="mt-1 line-clamp-2 text-body-sm text-surface/80">
          {collection.description}
        </p>
      </div>
    </Link>
  );
}
