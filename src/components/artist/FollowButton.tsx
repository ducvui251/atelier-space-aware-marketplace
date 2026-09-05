"use client";

import { useRouter } from "next/navigation";
import { Heart, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/store/hooks";

export function FollowButton({ artistId }: { artistId: string }) {
  const router = useRouter();
  const { currentUser, isFollowing, toggleFollow } = useAppState();
  const following = isFollowing(artistId);

  return (
    <Button
      variant={following ? "outline" : "secondary"}
      onClick={() => {
        if (!currentUser) {
          router.push("/login");
          return;
        }
        toggleFollow(artistId);
      }}
    >
      {following ? <HeartHandshake className="size-4" /> : <Heart className="size-4" />}
      {following ? "Following" : "Follow artist"}
    </Button>
  );
}
