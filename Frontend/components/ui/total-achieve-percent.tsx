import { AchievementsData } from "@/lib/types";
import { per } from "../achievements-view";

/**
 * One line saying how many of a game's achievements the user has unlocked,
 * and what percentage that is.
 */
function TotalAchievePercent({ a }: { a: AchievementsData | null }) {
  return (
    <div>
      {a && a.achievements && (
        <p className="text-sm text-muted-foreground">
          {a.totalAchieved} of {a.achievements.length} achievements unlocked:{" "}
          {per(a)}
        </p>
      )}
    </div>
  );
}

export { TotalAchievePercent };
