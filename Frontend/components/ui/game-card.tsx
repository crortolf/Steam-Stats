export function GameCard(game) {
  return (
    <div>
      const game = getGame(p.gameId) const friend = getFriend(p.friendId) if
      (!game || !friend) return null const playingNow = p.lastPlayed ===
      'Playing now' return (
      <li
        key={`${p.friendId}-${p.gameId}-${i}`}
        className="flex gap-3 rounded-lg border border-border bg-card p-3"
      >
        <div className="w-28 shrink-0 sm:w-36">
          <GameCapsule game={game} sizes="144px" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate font-semibold text-foreground">{game.title}</p>
          <p className="text-xs text-muted-foreground">{game.genre}</p>
          <div className="mt-auto flex items-center gap-2 pt-2">
            <div className="relative">
              <Image
                src={friend.avatar || "/placeholder.svg"}
                alt=""
                width={24}
                height={24}
                className="rounded"
              />
              <StatusDot
                status={friend.status as FriendStatus}
                className="absolute -bottom-0.5 -right-0.5 size-2 ring-2 ring-card"
              />
            </div>
            <span className="truncate text-sm text-foreground">
              {friend.name}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="font-mono text-muted-foreground">
              {p.hoursTwoWeeks}h past 2 weeks
            </span>
            <span
              className={cn(
                playingNow ? "text-status-ingame" : "text-muted-foreground",
              )}
            >
              {p.lastPlayed}
            </span>
          </div>
        </div>
      </li>
      )
    </div>
  );
}

module.exports = GameCard;
