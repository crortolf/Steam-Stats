"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";

//only shows a page's content, and so makes its requests, once the user has a
//steam api key and steam id, so children can rely on user.steamId being set
export function RequireSteamKey({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const linkClass = "font-medium text-primary hover:underline";

  if (loading) return <p className="text-sm">Loading...</p>;

  if (user === null) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link href="/sign-in" className={linkClass}>
          Sign in
        </Link>{" "}
        to see this page.
      </p>
    );
  }

  if (user.steamApiKey === null) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link href="/profile" className={linkClass}>
          Add your Steam API key
        </Link>{" "}
        to see this page.
      </p>
    );
  }

  if (user.steamId === null) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link href="/profile" className={linkClass}>
          Add your Steam account
        </Link>{" "}
        to see this page.
      </p>
    );
  }

  return children;
}
