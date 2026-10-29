import { cn } from "@/lib/utils";
import Image from "next/image";
import { LabeledBar } from "./achievements-pane";
import { Globe, Users } from "lucide-react";
import { SumAchievement } from "@/lib/types";
import { per } from "./achievements-view";

export function AchievementCard({
  name,
  achieve,
  friendsScanned,
}: {
  name: string;
  achieve: SumAchievement;
  friendsScanned: number;
}) {
  return (
    <li
      key={name}
      className={cn(
        "rounded-lg border border-border bg-card p-4",
        achieve.achieved && "opacity-80",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 grid size-9 shrink-0 place-items-center rounded-md",
            achieve.achieved
              ? "bg-primary/15 text-primary"
              : "bg-secondary/60 text-muted-foreground",
          )}
        >
          <Image
            src={achieve.achieved === 1 ? achieve.icon : achieve.icongray}
            alt={"Icon for " + name}
            width={30}
            height={30}
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-foreground">{achieve.name}</p>

            <span className="shrink-0 text-xs text-muted-foreground">
              {achieve.achieved === 1 ? achieve.time : "Locked"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{achieve.description}</p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <LabeledBar
              icon={<Globe className="size-3" />}
              label="Global"
              value={achieve.globalPercent}
              tone="muted"
            />
            {friendsScanned > 0 && (
              <LabeledBar
                icon={<Users className="size-3" />}
                label="Friends"
                value={Number(
                  ((achieve.friendsAchieved / friendsScanned) * 100).toFixed(1),
                )}
                tone="ingame"
              />
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
