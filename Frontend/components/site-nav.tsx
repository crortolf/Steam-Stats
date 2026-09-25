"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { currentUser } from "@/lib/mock-data";
import { StatusDot } from "@/components/status-dot";

const links = [
  { href: "/network", label: "Friend Network" },
  { href: "/games", label: "Games & News" },
  { href: "/achievements", label: "Achievements" },
  { href: "/profile", label: "Profile" },
];

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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

        <Link
          href="/profile"
          className="ml-auto hidden items-center gap-2 rounded px-2 py-1 hover:bg-secondary/60 md:flex"
        >
          <div className="relative">
            <Image
              src={currentUser.avatar || "/placeholder.svg"}
              alt=""
              width={28}
              height={28}
              className="rounded"
            />
            <StatusDot
              status={currentUser.status}
              className="absolute -bottom-0.5 -right-0.5 ring-2 ring-popover"
            />
          </div>
          <span className="text-sm font-medium text-foreground">
            {currentUser.name}
          </span>
        </Link>

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
        </nav>
      )}
    </header>
  );
}
