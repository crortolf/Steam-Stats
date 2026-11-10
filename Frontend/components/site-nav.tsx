"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const links = [
  { href: "/network", label: "Friend Network" },
  { href: "/games", label: "Games & News" },
  { href: "/achievements", label: "Achievements" },
  { href: "/recommendations", label: "Recommendations" },
  { href: "/profile", label: "Profile" },
];

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, loading, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-popover/95 backdrop-blur supports-[backdrop-filter]:bg-popover/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Link
          href="/"
          className="flex items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <Image
            src={"/favicon.ico"}
            alt="Steam Stats Percent Icon"
            width={40}
            height={40}
            className="rounded"
          />
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Steam Stats
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden min-w-0 items-center gap-2 md:flex">
          {user !== null && (
            <>
              <span className="truncate text-sm text-muted-foreground">
                {user.email}
              </span>
              <button
                type="button"
                onClick={signOut}
                className="shrink-0 rounded px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              >
                Sign out
              </button>
            </>
          )}
          {!loading && user === null && (
            <Link
              href="/sign-in"
              className="rounded px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            >
              Sign in
            </Link>
          )}
        </div>

        <button
          type="button"
          className="ml-auto grid size-9 place-items-center rounded text-muted-foreground hover:bg-secondary/60 hover:text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <nav
          className="border-t border-border bg-popover px-4 py-2 md:hidden"
          aria-label="Mobile"
        >
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded px-3 py-2 text-sm font-medium",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
          {user !== null && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="block w-full rounded px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            >
              Sign out
            </button>
          )}
          {!loading && user === null && (
            <Link
              href="/sign-in"
              onClick={() => setOpen(false)}
              className="block rounded px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            >
              Sign in
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
