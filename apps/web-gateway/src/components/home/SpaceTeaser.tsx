import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SpaceTeaser() {
  return (
    <div className="relative overflow-hidden rounded-xl">
      <Image
        src="https://picsum.photos/seed/space-teaser/1600/900"
        alt="Art hanging in a warm interior"
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-foreground/75 via-foreground/50 to-transparent" />
      <div className="relative flex min-h-[320px] flex-col justify-center p-8 md:min-h-[420px] md:p-14">
        <div className="max-w-md">
          <p className="eyebrow text-surface/80">Art for your space</p>
          <h2 className="mt-4 font-display text-h1 text-surface text-balance">
            Preview it against your own walls.
          </h2>
          <p className="mt-4 text-body text-surface/85">
            Choose a room, place a work, and tune the scale before you commit.
          </p>
          <Button asChild variant="secondary" size="lg" className="mt-6">
            <Link href="/rooms">
              Try the room view
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
