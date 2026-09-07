export type NavItem = {
  label: string;
  href: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Discover", href: "/" },
  { label: "Artworks", href: "/artworks" },
  { label: "Artists", href: "/artists" },
  { label: "Rooms", href: "/rooms" },
  { label: "Collections", href: "/#collections" },
];

export const WORDMARK = "ATELIER";
