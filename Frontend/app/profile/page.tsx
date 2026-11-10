"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PasswordReset } from "@/components/password-reset";
import { SteamApiKey } from "@/components/steam-api-key";
import { SteamId } from "@/components/steam-id";
import { useAuth } from "@/lib/auth";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user === null) router.replace("/sign-in");
  }, [loading, user, router]);

  if (user === null) {
    return <main className="mx-auto max-w-2xl px-4 py-8">Loading...</main>;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        Profile
      </h1>

      <div className="mt-6 flex flex-col gap-6">
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold text-foreground">Email</h2>
          <p className="mt-2 break-all text-sm text-muted-foreground">
            {user.email}
          </p>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold text-foreground">Password</h2>
          <PasswordReset />
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold text-foreground">Steam API key</h2>
          <SteamApiKey apiKey={user.steamApiKey} />
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold text-foreground">Steam account</h2>
          <SteamId steamId={user.steamId} />
        </section>
      </div>
    </main>
  );
}
