/**
 * Deterministic placeholder imagery helper (Step 2 only).
 * Swapped for real artwork delivery/CDN before Step 3.
 */

export function artworkImage(seed: string, width: number, height: number): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}

export function portraitImage(seed: string): string {
  return artworkImage(seed, 900, 1100);
}

export function landscapeImage(seed: string): string {
  return artworkImage(seed, 1100, 780);
}

export function squareImage(seed: string): string {
  return artworkImage(seed, 1000, 1000);
}

export function artistPortrait(seed: string): string {
  return artworkImage(seed, 640, 760);
}
