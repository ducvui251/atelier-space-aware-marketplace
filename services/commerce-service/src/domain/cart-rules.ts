export function getCart(cartsByUser: Readonly<Record<string, readonly string[]>>, userId: string): string[] { return [...(cartsByUser[userId] ?? [])]; }
export function addToCart(cartsByUser: Readonly<Record<string, readonly string[]>>, userId: string, artworkId: string): string[] {
  const cart = getCart(cartsByUser, userId);
  return cart.includes(artworkId) ? cart : [...cart, artworkId];
}
export function removeFromCart(cartsByUser: Readonly<Record<string, readonly string[]>>, userId: string, artworkId: string): string[] { return getCart(cartsByUser, userId).filter((id) => id !== artworkId); }
