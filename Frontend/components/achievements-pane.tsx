"use client";

import { useMemo, useState } from "react";
import {
  AchievementsData,
  QuickGameInfo,
  Achievement,
  SumAchievement,
  SumAchievementData,
} from "@/lib/types";
import { GameCapsule } from "./game-capsule";
import { Trophy, Lock, Check, Globe, Users, ArrowUp, ArrowDown } from "lucide-react";
import { per } from "./achievements-view";
import { cn } from "@/lib/utils";
import { AchievementCard } from "./achievement-card";
import { achievements } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";

type SortKey = "global" | "friends" | "unlocked" | "name";
type SortDir = "asc" | "desc";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "global", label: "Global rarity" },
  { key: "friends", label: "Friend rarity" },
  { key: "unlocked", label: "Unlocked" },
  { key: "name", label: "Name" },
];

const DEFAULT_DIR: Record<SortKey, SortDir> = {
  global: "asc",
  friends: "asc",
  unlocked: "desc",
  name: "asc",
};

function friendRate(achieve: SumAchievement, friendsScanned: number) {
  return friendsScanned > 0 ? achieve.friendsAchieved / friendsScanned : 0;
}

function compareAchievements(
  a: SumAchievement,
  b: SumAchievement,
  key: SortKey,
  dir: SortDir,
  friendsScanned: number,
) {
  const sign = dir === "asc" ? 1 : -1;
  let delta = 0;

  switch (key) {
    case "global":
      delta = a.globalPercent - b.globalPercent;
      break;
    case "friends":
      delta = friendRate(a, friendsScanned) - friendRate(b, friendsScanned);
      break;
    case "unlocked":
      delta = a.achieved - b.achieved;
      break;
    case "name":
      delta = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      break;
  }

  if (delta !== 0) return delta * sign;
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function sortHint(key: SortKey, dir: SortDir) {
  switch (key) {
    case "global":
    case "friends":
      return dir === "asc" ? "Rarest first" : "Most common first";
    case "unlocked":
      return dir === "desc" ? "Unlocked first" : "Locked first";
    case "name":
      return dir === "asc" ? "A to Z" : "Z to A";
  }
}

export function AchievementsPane({
  achievementsData,
}: {
  achievementsData: SumAchievementData;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("global");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sortedAchievements = useMemo(
    () =>
      Object.entries(achievementsData.achievements).sort(([, a], [, b]) =>
        compareAchievements(
          a,
          b,
          sortKey,
          sortDir,
          achievementsData.totalFriendsScanned,
        ),
      ),
    [
      achievementsData.achievements,
      achievementsData.totalFriendsScanned,
      sortKey,
      sortDir,
    ],
  );

  function selectSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(DEFAULT_DIR[key]);
  }
  const [rarestAchieveId, rarestAchieve] = Object.entries(
    achievementsData.achievements,
  ).reduce(([rarestId, rarest], [currentId, current]) =>
    rarest.globalPercent < current.globalPercent
      ? [rarestId, rarest]
      : [currentId, current],
  );
  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* Left: summary */}
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <GameCapsule
            game={{
              appid: achievementsData.id,
              appImage: achievementsData.image,
              title: achievementsData.name,
            }}
            sizes="300px"
            priority
          />
          <div className="p-4">
            <h2 className="font-semibold text-foreground">
              {achievementsData.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              Developed by {achievementsData.developers.join(", ")}
              <br />
              Published by {achievementsData.publishers.join(", ")}
            </p>
          </div>
        </div>
        {/* completion ring-ish */}
        {/* <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="size-4 text-primary" /> Your completion
          </div>
          <p className="mt-2 font-mono text-4xl font-bold text-foreground">
            {per(achievementsData)}
            <span className="text-2xl text-muted-foreground">%</span>
          </p>
          <Bar value={per(achievementsData} tone="primary" className="mt-3" />
        </div> */}
        {/* <div className="grid grid-cols-2 gap-4">
          Global standing and among friends area
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
        </div> */}
        {rarestAchieve && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              Rarest unlock
            </p>
            <p className="mt-1 font-semibold text-foreground">
              {rarestAchieve.name}
            </p>
            <p className="text-xs text-muted-foreground">
              Only {rarestAchieve.globalPercent}% of players have this
            </p>
          </div>
        )}
        {/* rarest achieve */}
      </div>
      {/* Right: comparison + achievement list */}
      <div className="flex flex-col gap-6">
        <p className="text-m text-muted-foreground">
          {achievementsData.totalFriendsScanned} friends have this game and
          achievements public
        </p>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 font-semibold text-foreground">
            Completion, compared
          </h3>
          <ComparisonRow
            label="You"
            value={Number(
              (
                (achievementsData.totalAchieved /
                  achievementsData.totalAchieves) *
                100
              ).toFixed(1),
            )}
            tone="primary"
          />
          {achievementsData.totalFriendsScanned > 0 && (
            <ComparisonRow
              label="Your friends (avg)"
              value={Number(
                (
                  (achievementsData.totalFriendsAchievements /
                    achievementsData.totalAchieves /
                    achievementsData.totalFriendsScanned) *
                  100
                ).toFixed(1),
              )}
              tone="ingame"
            />
          )}

          <ComparisonRow
            label="Global players (avg)"
            value={achievementsData.totalGlobalAchievesPercent}
            tone="muted"
          />
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-foreground">All achievements</h3>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Sort achievements"
            >
              {SORTS.map((sort) => {
                const active = sort.key === sortKey;
                return (
                  <Button
                    key={sort.key}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    aria-pressed={active}
                    title={
                      active
                        ? `${sortHint(sort.key, sortDir)}. Click to reverse.`
                        : `Sort by ${sort.label.toLowerCase()}`
                    }
                    onClick={() => selectSort(sort.key)}
                  >
                    {sort.label}
                    {active &&
                      (sortDir === "asc" ? (
                        <ArrowUp aria-hidden />
                      ) : (
                        <ArrowDown aria-hidden />
                      ))}
                  </Button>
                );
              })}
            </div>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            {sortHint(sortKey, sortDir)}
          </p>
          <ul className="flex flex-col gap-2">
            {sortedAchievements.map(([name, achieve]) => (
              <AchievementCard
                key={name}
                name={name}
                achieve={achieve}
                friendsScanned={achievementsData.totalFriendsScanned}
              />
            ))}
          </ul>
        </div>
      </div>
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
        <span className="font-mono text-muted-foreground">{value}%</span>
      </div>
      <Bar value={value} tone={tone} />
    </div>
  );
}

export function LabeledBar({
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
