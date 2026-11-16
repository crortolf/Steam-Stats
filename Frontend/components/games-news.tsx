"use client";

import { useState, useEffect, useMemo } from "react";
import { Clock, Newspaper } from "lucide-react";
import {
  SortChips,
  type SortDirection,
  type SortOption,
} from "@/components/sort-chips";
import { GameCapsule } from "@/components/game-capsule";
import { GameNewsFeed } from "@/components/game-news-feed";
import FriendCapsule from "./friend-capsule";
import { NewsItem, FriendGame } from "../lib/types";
import axios from "axios";
import { useAuth } from "@/lib/auth";

type SortKey = "title" | "friends";

const SORT_OPTIONS: readonly SortOption<SortKey>[] = [
  { key: "title", label: "Title" },
  { key: "friends", label: "Friends" },
];

const describeSort = (key: SortKey, direction: SortDirection) =>
  key === "title"
    ? direction === "asc"
      ? "A to Z"
      : "Z to A"
    : direction === "asc"
      ? "Fewest friends first"
      : "Most friends first";

const titleCollator = new Intl.Collator(undefined, {
  sensitivity: "base",
  numeric: true,
});
const byTitle = (a: FriendGame, b: FriendGame) =>
  titleCollator.compare(a.game.name, b.game.name);
const friendCount = (g: FriendGame) =>
  g.players.filter((p) => p !== null).length + (g.otherPlayers ?? 0);

// "and 2 other players" after named friends, "3 players" when nobody is named
const otherPlayersText = (others: number, anyNamed: boolean) => {
  const players = others === 1 ? "player" : "players";
  return anyNamed
    ? `and ${others} other ${players}`
    : `${others} ${players} played this recently`;
};

// Direction each sort starts in when first picked: A→Z, most friends first.
const defaultDirection: Record<SortKey, SortDirection> = {
  title: "asc",
  friends: "desc",
};

export function GamesNews() {
  //RequireSteamKey only renders this once the user has a steam id
  const steamId = useAuth().user?.steamId ?? null;
  const [gamesNews, setGamesNews] = useState<FriendGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<FriendGame | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("friends");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedGames = useMemo(() => {
    const sign = sortDirection === "asc" ? 1 : -1;
    return [...gamesNews].sort((a, b) =>
      sortKey === "title"
        ? sign * byTitle(a, b)
        : // games with the same number of friends stay in A→Z order
          sign * (friendCount(a) - friendCount(b)) || byTitle(a, b),
    );
  }, [gamesNews, sortKey, sortDirection]);

  // Picking the active sort flips its direction; picking the other one
  // switches to it in its natural direction.
  const chooseSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(defaultDirection[key]);
    }
  };

  console.log(gamesNews);

  useEffect(() => {
    if (steamId === null) return;
    const controller = new AbortController();

    //TODO: finish loading api data into react frontend for viewing in console, then replace fake data
    function load() {
      axios
        .get<FriendGame[]>("http://localhost:5011/circleNews/getNews", {
          params: { id: steamId },
          withCredentials: true,
          signal: controller.signal,
        })
        .then((res) => {
          setGamesNews(res.data.filter((g) => g.game !== undefined));
        })
        .catch((err) => {
          if (!axios.isCancel(err)) {
            setError("Failed to load news");
          }
        })
        .finally(() => {
          setLoading(false);
          console.log(gamesNews);
        });
    }

    load();
    return () => controller.abort(); // cleanup
  }, [steamId]);

  useEffect(() => {
    console.log(selectedGame);
  }, [selectedGame]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  const filteredNews: NewsItem[] = [];

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      {/* Recently played by friends */}
      <section className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Clock className="size-4" /> Recently played by friends
          </h2>
          <SortChips
            options={SORT_OPTIONS}
            activeKey={sortKey}
            direction={sortDirection}
            onSelect={chooseSort}
            describe={describeSort}
            ariaLabel="Sort games"
          />
        </div>
        <ul className="flex flex-col gap-3 h-170 overflow-y-scroll">
          {sortedGames.map((p) => {
            return (
              <li
                key={`${p.game.id}`}
                className="flex gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/40"
                onClick={() => {
                  if (selectedGame === p) setSelectedGame(null);
                  else setSelectedGame(p);
                }}
              >
                <div className="w-28 shrink-0 sm:w-36">
                  <GameCapsule game={p.game} sizes="144px" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate font-semibold text-foreground">
                    {p.game.name}
                  </p>
                  <div className="mt-auto flex items-center gap-2 overflow-x-auto pt-2">
                    {p.players
                      .filter((f) => f !== null)
                      .map((friendPlayer) => {
                        return <FriendCapsule friendPlayer={friendPlayer} />;
                      })}
                    {(p.otherPlayers ?? 0) > 0 && (
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {otherPlayersText(
                          p.otherPlayers ?? 0,
                          p.players.some((f) => f !== null),
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}

          {/**games.length === 0 && (
            <li className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No friends have played this recently.
            </li>
          )**/}
        </ul>
      </section>

      {/* News feed */}
      <section className="min-w-0">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Newspaper className="size-4" /> Game news
        </h2>
        {selectedGame === null ? (
          <div>Select a game for News</div>
        ) : (
          <GameNewsFeed key={selectedGame.game.id} game={selectedGame.game} />
        )}
      </section>
    </div>
  );
}
