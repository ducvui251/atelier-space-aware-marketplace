"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LayoutDashboard, LogOut, Package, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/lib/store/hooks";
import { cn } from "@/lib/utils";

export function AccountMenu({ className }: { className?: string }) {
  const { currentUser, logout } = useAuth();

  if (!currentUser) {
    return (
      <Link
        href="/login"
        aria-label="Sign in"
        className={cn(
          "focus-ring flex size-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted",
          className,
        )}
      >
        <User className="size-5" />
      </Link>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className={cn(
            "focus-ring flex size-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted",
            className,
          )}
        >
          <User className="size-5" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-56 rounded-md border border-border bg-surface p-1.5 shadow-md"
        >
          <div className="px-2.5 py-2">
            <p className="text-body-sm font-medium text-foreground">{currentUser.fullName}</p>
            <p className="text-caption text-muted-foreground">{currentUser.email}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild>
            <Link
              href="/account"
              className="focus-ring flex items-center gap-2 rounded-sm px-2.5 py-2 text-body-sm text-foreground outline-none transition-colors hover:bg-muted"
            >
              <User className="size-4" />
              Tài khoản
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link
              href="/orders"
              className="focus-ring flex items-center gap-2 rounded-sm px-2.5 py-2 text-body-sm text-foreground outline-none transition-colors hover:bg-muted"
            >
              <Package className="size-4" />
              Đơn hàng
            </Link>
          </DropdownMenu.Item>
          {currentUser.role === "artist" ? (
            <DropdownMenu.Item asChild>
              <Link
                href="/artist"
                className="focus-ring flex items-center gap-2 rounded-sm px-2.5 py-2 text-body-sm text-foreground outline-none transition-colors hover:bg-muted"
              >
                <LayoutDashboard className="size-4" />
                Artist dashboard
              </Link>
            </DropdownMenu.Item>
          ) : null}
          {currentUser.role === "admin" ? (
            <DropdownMenu.Item asChild>
              <Link
                href="/admin"
                className="focus-ring flex items-center gap-2 rounded-sm px-2.5 py-2 text-body-sm text-foreground outline-none transition-colors hover:bg-muted"
              >
                <ShieldCheck className="size-4" />
                Admin
              </Link>
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={() => logout()}
            className="focus-ring flex items-center gap-2 rounded-sm px-2.5 py-2 text-body-sm text-destructive outline-none transition-colors hover:bg-destructive-soft"
          >
            <LogOut className="size-4" />
            Đăng xuất
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
