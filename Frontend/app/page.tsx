import Link from "next/link";
import Image from "next/image";
import { Network, Gamepad2, Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameCapsule } from "@/components/game-capsule";
import { StatusDot } from "@/components/status-dot";
import { games, friends, statusLabel, getGame } from "@/lib/mock-data";

const features = [
  {
    href: "/network",
    icon: Network,
    title: "Friend Network",
    desc: "Visualize your entire Steam social graph as an interactive web of nodes and connections.",
  },
  {
    href: "/games",
    icon: Gamepad2,
    title: "Games & News",
    desc: "See what your friends are playing right now and stay current with the latest game updates.",
  },
  {
    href: "/achievements",
    icon: Trophy,
    title: "Achievements",
    desc: "Compare your completion stats against the world and against the friends you play with.",
  },
];

export default function LandingPage() {
  const onlineFriends = friends
    .filter((f) => f.status !== "offline")
    .slice(0, 5);

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 60% at 20% 0%, rgba(102,192,244,0.18), transparent 60%), radial-gradient(50% 50% at 90% 20%, rgba(26,159,255,0.14), transparent 55%)",
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <h1 className="mt-5 text-balance text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
              Your Steam world, <span className="text-primary">connected</span>.
            </h1>
            <p className="mt-4 max-w-md text-pretty leading-relaxed text-muted-foreground">
              Nexus maps your friend network, tracks what everyone&apos;s
              playing, and shows exactly how your achievements stack up against
              the world. All in one place.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                nativeButton={false}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                render={<Link href="/network" />}
              >
                Sign in through Steam
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                className="border-border bg-transparent text-foreground hover:bg-secondary"
                render={<Link href="/games" />}
              >
                Explore the demo
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Demo experience with sample data — no account required.
            </p>
          </div>

          {/* Live-activity preview card */}
          <div className="relative">
            <div className="rounded-xl border border-border bg-card/80 p-4 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between px-1 pb-3">
                <span className="text-sm font-semibold text-foreground">
                  Friends Activity
                </span>
                <span className="text-xs text-muted-foreground">
                  {onlineFriends.length} online
                </span>
              </div>
              <ul className="flex flex-col gap-1">
                {onlineFriends.map((f) => {
                  const game = f.currentGameId
                    ? getGame(f.currentGameId)
                    : undefined;
                  return (
                    <li
                      key={f.id}
                      className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-secondary/50"
                    >
                      <div className="relative">
                        <Image
                          src={f.avatar || "/placeholder.svg"}
                          alt=""
                          width={40}
                          height={40}
                          className="rounded"
                        />
                        <StatusDot
                          status={f.status}
                          className="absolute -bottom-0.5 -right-0.5 ring-2 ring-card"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {f.name}
                        </p>
                        <p
                          className={
                            f.status === "ingame"
                              ? "truncate text-xs text-status-ingame"
                              : "truncate text-xs text-status-online"
                          }
                        >
                          {game ? game.title : statusLabel[f.status]}
                        </p>
                      </div>
                      {game && (
                        <div className="hidden w-24 sm:block">
                          <GameCapsule game={game} sizes="96px" />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Everything in one hub
        </h2>
        <p className="mt-1 text-muted-foreground">
          Four connected views of your Steam life.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group flex flex-col rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/50 hover:bg-card/70"
            >
              <span className="grid size-11 place-items-center rounded-lg bg-primary/15 text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {f.title}
              </h3>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">
                {f.desc}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Open
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Popular games strip */}
      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Trending with your friends
            </h2>
            <p className="mt-1 text-muted-foreground">
              The titles your circle is playing most.
            </p>
          </div>
          <Link
            href="/games"
            className="hidden text-sm font-medium text-primary hover:underline sm:inline"
          >
            View all
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {games.map((g) => (
            <Link key={g.id} href="/games" className="group">
              <GameCapsule
                game={g}
                className="ring-1 ring-border transition group-hover:ring-primary/60"
                sizes="(max-width: 768px) 50vw, 200px"
              />
              <p className="mt-2 truncate text-sm font-medium text-foreground">
                {g.title}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {g.genre}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <p>Nexus — a Steam-style social hub demo.</p>
          <p>Not affiliated with Valve or Steam. Sample data only.</p>
        </div>
      </footer>
    </main>
  );
}
