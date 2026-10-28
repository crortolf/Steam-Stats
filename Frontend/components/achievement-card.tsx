import { cn } from "@/lib/utils";
import Image from "next/image";
import { LabeledBar } from "./achievements-pane";
import { Globe } from "lucide-react";

export function AchievementCard({
  playerAchieve,
  globalAchieve,
}: {
  playerAchieve: any;
  globalAchieve: any;
}) {
  console.log(globalAchieve);

  return (
    <li
      key={playerAchieve.aId}
      className={cn(
        "rounded-lg border border-border bg-card p-4",
        !playerAchieve.achieved && "opacity-80",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 grid size-9 shrink-0 place-items-center rounded-md",
            playerAchieve.achieved
              ? "bg-primary/15 text-primary"
              : "bg-secondary/60 text-muted-foreground",
          )}
        >
          <Image
            src={
              playerAchieve.achieved === 1
                ? globalAchieve.icon
                : globalAchieve.icongray
            }
            alt={"Icon for " + playerAchieve.name}
            width={30}
            height={30}
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-foreground">{playerAchieve.name}</p>

            <span className="shrink-0 text-xs text-muted-foreground">
              {playerAchieve.achieved === 1 ? playerAchieve.time : "Locked"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {playerAchieve.description}
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <LabeledBar
              icon={<Globe className="size-3" />}
              label="Global"
              value={globalAchieve.globalPercent}
              tone="muted"
            />
            {/*<LabeledBar
              icon={<Users className="size-3" />}
              label="Friends"
              value={playerAchieve.friendsPct}
              tone="ingame"
            /> */}
          </div>
        </div>
      </div>
    </li>
  );
}
