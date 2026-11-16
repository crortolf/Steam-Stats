import Link from "next/link";
import { Network, Gamepad2, Trophy, ThumbsUp, ArrowRight } from "lucide-react";

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
  {
    href: "/recommendations",
    icon: ThumbsUp,
    title: "Recommendations",
    desc: "Recommend games to the community or just your friends, with a score, screenshots, and the achievements worth chasing.",
  },
];

export default function LandingPage() {
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
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-16 text-center md:py-24">
          <h1 className="mt-5 text-balance text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
            Your Steam world, <span className="text-primary">connected</span>.
          </h1>
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
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <p>Nexus — a Steam social hub.</p>
          <p>Not affiliated with Valve or Steam.</p>
        </div>
      </footer>
    </main>
  );
}
