"use client";

import { useMemo, useState } from "react";
import { Trophy, Lock, Check, Globe, Users } from "lucide-react";
import {
  achievements,
  games,
  getGame,
  type Achievement,
} from "@/lib/mock-data";
import { GameCapsule } from "@/components/game-capsule";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Only games that actually have achievements in the dataset.
const gamesWithAchievements = games.filter((g) =>
  achievements.some((a) => a.appId === g.appId),
);

function avg(nums: number[]) {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

export function AchievementsView() {
  const [gameId, setGameId] = useState(gamesWithAchievements[0]?.appId ?? "");
  const game = getGame(gameId);

  const list = useMemo(
    () =>
      achievements
        .filter((a) => a.appId === gameId)
        .sort((a, b) => b.globalPct - a.globalPct),
    [gameId],
  );

  const stats = useMemo(() => {
    const total = list.length;
    const unlocked = list.filter((a) => a.unlockedByUser);
    const completion = total === 0 ? 0 : (unlocked.length / total) * 100;

    // Rarity-based standing: unlocking rarer achievements => stronger standing.
    const globalRarity = avg(unlocked.map((a) => 100 - a.globalPct));
    const friendsRarity = avg(unlocked.map((a) => 100 - a.friendsPct));
    const globalTopPct = Math.max(1, Math.round(100 - globalRarity));
    const friendsTopPct = Math.max(1, Math.round(100 - friendsRarity));

    const globalAvgCompletion = avg(list.map((a) => a.globalPct));
    const friendsAvgCompletion = avg(list.map((a) => a.friendsPct));

    const rarest = unlocked.reduce<Achievement | null>(
      (min, a) => (min === null || a.globalPct < min.globalPct ? a : min),
      null,
    );

    return {
      total,
      unlockedCount: unlocked.length,
      completion,
      globalTopPct,
      friendsTopPct,
      globalAvgCompletion,
      friendsAvgCompletion,
      rarest,
    };
  }, [list]);

  return (
    <div>
      {/* game selector */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="w-full max-w-xs">
          <Select
            value={gameId}
            onValueChange={(value) => {
              if (value !== null) setGameId(value);
            }}
          >
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Select a game" />
            </SelectTrigger>
            <SelectContent>
              {gamesWithAchievements.map((g) => (
                <SelectItem key={g.appId} value={g.appId}>
                  {g.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {game && (
          <p className="text-sm text-muted-foreground">
            {stats.unlockedCount} of {stats.total} achievements unlocked
          </p>
        )}
      </div>

      {game && (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Left: summary */}
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <GameCapsule
                game={{
                  appid: game.appId,
                  appImage: game.image,
                  title: game.title,
                }}
                sizes="300px"
                priority
              />
              <div className="p-4">
                <h2 className="font-semibold text-foreground">{game.title}</h2>
                <p className="text-xs text-muted-foreground">
                  {game.developer}
                </p>
              </div>
            </div>

            {/* completion ring-ish */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="size-4 text-primary" /> Your completion
              </div>
              <p className="mt-2 font-mono text-4xl font-bold text-foreground">
                {Math.round(stats.completion)}
                <span className="text-2xl text-muted-foreground">%</span>
              </p>
              <Bar value={stats.completion} tone="primary" className="mt-3" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <StandingCard
                icon={<Globe className="size-4" />}
                label="Global standing"
                value={`Top ${stats.globalTopPct}%`}
                hint="by achievement rarity"
              />
              <StandingCard
                icon={<Users className="size-4" />}
                label="Among friends"
                value={`Top ${stats.friendsTopPct}%`}
                hint="who played this"
              />
            </div>

            {stats.rarest && (
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">
                  Rarest unlock
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {stats.rarest.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Only {stats.rarest.globalPct}% of players have this
                </p>
              </div>
            )}
          </div>

          {/* Right: comparison + achievement list */}
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-4 font-semibold text-foreground">
                Completion, compared
              </h3>
              <ComparisonRow
                label="You"
                value={stats.completion}
                tone="primary"
              />
              <ComparisonRow
                label="Your friends (avg)"
                value={stats.friendsAvgCompletion}
                tone="ingame"
              />
              <ComparisonRow
                label="Global players (avg)"
                value={stats.globalAvgCompletion}
                tone="muted"
              />
            </div>

            <div>
              <h3 className="mb-3 font-semibold text-foreground">
                All achievements
              </h3>
              <ul className="flex flex-col gap-2">
                {list.map((a) => (
                  <li
                    key={a.id}
                    className={cn(
                      "rounded-lg border border-border bg-card p-4",
                      !a.unlockedByUser && "opacity-80",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 grid size-9 shrink-0 place-items-center rounded-md",
                          a.unlockedByUser
                            ? "bg-primary/15 text-primary"
                            : "bg-secondary/60 text-muted-foreground",
                        )}
                      >
                        {a.unlockedByUser ? (
                          <Check className="size-5" />
                        ) : (
                          <Lock className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-foreground">
                            {a.name}
                          </p>
                          {a.unlockedByUser && a.unlockedDate && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {a.unlockedDate}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {a.description}
                        </p>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <LabeledBar
                            icon={<Globe className="size-3" />}
                            label="Global"
                            value={a.globalPct}
                            tone="muted"
                          />
                          <LabeledBar
                            icon={<Users className="size-3" />}
                            label="Friends"
                            value={a.friendsPct}
                            tone="ingame"
                          />
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const toneBg: Record<string, string> = {
  primary: "bg-primary",
  ingame: "bg-status-ingame",
  muted: "bg-muted-foreground",
};

function Bar({
  value,
  tone,
  className,
}: {
  value: number;
  tone: keyof typeof toneBg;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-secondary/60",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full", toneBg[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function ComparisonRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof toneBg;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="font-mono text-muted-foreground">
          {Math.round(value)}%
        </span>
      </div>
      <Bar value={value} tone={tone} />
    </div>
  );
}

function LabeledBar({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: keyof typeof toneBg;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          {icon}
          {label}
        </span>
        <span className="font-mono">{value}%</span>
      </div>
      <Bar value={value} tone={tone} />
    </div>
  );
}

function StandingCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
