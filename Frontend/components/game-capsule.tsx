import Image from "next/image";
import { cn } from "@/lib/utils";
//TODO: add use for lastPlayed and playTime fields

//callers pass either the Game shape (image/name) or the QuickGameInfo shape (appImage/title)
type CapsuleGame = {
  image?: string;
  appImage?: string;
  name?: string;
  title?: string;
  [key: string]: unknown;
};

export function GameCapsule({
  game,
  lastPlayed,
  playtime,
  className,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 320px",
}: {
  game: CapsuleGame;
  lastPlayed?: string;
  playtime?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[460/215] w-full overflow-hidden rounded-md",
        className,
      )}
    >
      <Image
        src={game.image || game.appImage || "/placeholder.svg"}
        alt={`${game.name || game.title} cover art`}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}
