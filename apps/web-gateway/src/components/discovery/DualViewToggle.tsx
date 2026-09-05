"use client";

import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, Sofa } from "lucide-react";
import { cn } from "@/lib/utils";

interface DualViewToggleProps {
  className?: string;
}

export function DualViewToggle({ className }: DualViewToggleProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isRoom = pathname === "/rooms";

  return (
    <div
      role="group"
      aria-label="Discovery view"
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-surface p-1",
        className,
      )}
    >
      <button
        type="button"
        aria-pressed={!isRoom}
        onClick={() => router.push("/artworks")}
        className={cn(
          "focus-ring inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-label transition-colors",
          !isRoom ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <LayoutGrid className="size-4" />
        Catalog
      </button>
      <button
        type="button"
        aria-pressed={isRoom}
        onClick={() => router.push("/rooms")}
        className={cn(
          "focus-ring inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-label transition-colors",
          isRoom ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Sofa className="size-4" />
        Room
      </button>
    </div>
  );
}
