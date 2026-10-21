import { Player } from "../lib/types";
import Image from "next/image";

export default function FriendCapsule({
  friendPlayer,
}: {
  friendPlayer: Player;
}) {
  return (
    <div style={{ display: "flex", flexShrink: "0" }}>
      <Image
        src={friendPlayer.avatar || "/placeholder.svg"}
        alt=""
        width={24}
        height={24}
        className="rounded"
      />
      <span className="truncate text-sm text-foreground">
        {friendPlayer.name}
      </span>
    </div>
  );
}
