import { cn } from "@/lib/utils";
import type { FriendStatus } from "@/lib/mock-data";

const colorByStatus: Record<FriendStatus, string> = {
  Online: "bg-status-online",
  Offline: "bg-status-offline",
  Away: "bg-status-offline",
  "Looking to play": "bg-status-offline",
  "Looking to trade": "bg-status-offline",
  Busy: "bg-status-offline",
  Snooze: "bg-status-offline",
};

/**
 * A small coloured dot for a player's Steam status: light blue when online,
 * grey for every other status.
 */
export function StatusDot({
  status,
  className,
}: {
  status: FriendStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full",
        colorByStatus[status],
        className,
      )}
      aria-hidden="true"
    />
  );
}
