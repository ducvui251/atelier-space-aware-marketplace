"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Menu, Search, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, WORDMARK } from "@/constants/nav";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { useCart, useSaved } from "@/lib/store/hooks";

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  if (href.startsWith("/#")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();
  const { cartArtworkIds } = useCart();
  const { savedArtworkIds } = useSaved();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-sm">
      <div className="container-page flex h-16 items-center justify-between gap-4 md:h-[72px]">
        {/* Mobile menu */}
        <div className="flex items-center gap-1 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                className="focus-ring flex size-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
              >
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[320px] p-0">
              <div className="px-6 py-6">
                <SheetTitle>
                  <Link
                    href="/"
                    className="font-serif-display text-h2 text-foreground"
                  >
                    {WORDMARK}
                  </Link>
                </SheetTitle>
              </div>
              <nav className="flex flex-col px-4">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      "focus-ring rounded-md px-3 py-3 text-body text-foreground transition-colors hover:bg-muted",
                      isActive(item.href, pathname) && "font-medium text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* Wordmark */}
        <Link
          href="/"
          aria-label="ATELIER home"
          className="focus-ring font-serif-display text-h3 text-foreground md:text-h2"
        >
          {WORDMARK}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "focus-ring rounded-md px-3 py-2 text-body-sm text-muted-foreground transition-colors hover:text-foreground",
                isActive(item.href, pathname) &&
                  "font-medium text-foreground underline underline-offset-8",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <IconAction label="Search" href="/artworks?view=catalog#search">
            <Search className="size-5" />
          </IconAction>
          <IconAction label="Saved" href="/saved" badge={savedArtworkIds.length || undefined}>
            <Heart className="size-5" />
          </IconAction>
          <IconAction label="Cart" href="/cart" badge={cartArtworkIds.length || undefined}>
            <ShoppingBag className="size-5" />
          </IconAction>
          <AccountMenu className="hidden sm:inline-flex" />
        </div>
      </div>
    </header>
  );
}

function IconAction({
  label,
  href,
  children,
  badge,
  className,
}: {
  label: string;
  href: string;
  children: React.ReactNode;
  badge?: number;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "focus-ring relative flex size-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted",
        className,
      )}
    >
      {children}
      {badge ? (
        <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold leading-none text-primary-foreground">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
