import {
  AchievementsData,
  QuickGameInfo,
  Achievement,
  SumAchievementData,
} from "@/lib/types";
import { GameCapsule } from "./game-capsule";
import { Trophy, Lock, Check, Globe, Users } from "lucide-react";
import { per } from "./achievements-view";
import { cn } from "@/lib/utils";
import { AchievementCard } from "./achievement-card";
import { achievements } from "@/lib/mock-data";

export function AchievementsPane({
  achievementsData,
}: {
  achievementsData: SumAchievementData;
}) {
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
          <h3 className="mb-3 font-semibold text-foreground">
            All achievements
          </h3>
          <ul className="flex flex-col gap-2">
            {/* insert achivemenet card here */}
            {Object.entries(achievementsData.achievements).map(
              ([name, achieve]) => {
                return (
                  <AchievementCard
                    name={name}
                    achieve={achieve}
                    friendsScanned={achievementsData.totalFriendsScanned}
                  />
                );
              },
            )}
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
