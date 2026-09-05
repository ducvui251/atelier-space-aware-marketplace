import Link from "next/link";
import { WORDMARK } from "@/constants/nav";

const footerColumns = [
  {
    title: "Explore",
    links: [
      { label: "Artworks", href: "/artworks" },
      { label: "Artists", href: "/artists" },
      { label: "Rooms", href: "/rooms" },
      { label: "Collections", href: "/#collections" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "Our approach", href: "/" },
      { label: "Authentication", href: "/" },
      { label: "Buying with us", href: "/" },
      { label: "Shipping", href: "/" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Contact", href: "/" },
      { label: "Returns", href: "/" },
      { label: "FAQs", href: "/" },
      { label: "Account", href: "/saved" },
      { label: "API Docs", href: "/api-docs" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-surface-strong/40">
      <div className="container-page py-16">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <p className="font-serif-display text-h2 text-foreground">{WORDMARK}</p>
            <p className="mt-4 text-body text-muted-foreground">
              Original and limited-edition artworks, chosen around your taste,
              space, and budget.
            </p>
          </div>

          {footerColumns.map((col) => (
            <div key={col.title}>
              <p className="eyebrow mb-4">{col.title}</p>
              <ul className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="focus-ring rounded-sm text-body-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-border pt-8 text-caption text-subdued md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} ATELIER. Placeholder concept — Step 2 visual scaffold.</p>
          <div className="flex gap-6">
            <Link href="/" className="focus-ring rounded-sm hover:text-foreground">
              Privacy
            </Link>
            <Link href="/" className="focus-ring rounded-sm hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
