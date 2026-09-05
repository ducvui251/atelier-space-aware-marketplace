export function artworkImage(seed: string, width: number, height: number): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}
