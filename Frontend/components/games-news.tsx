"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Clock, Newspaper } from "lucide-react";
import { GameCapsule } from "@/components/game-capsule";
import FriendCapsule from "./friend-capsule";
import { NewsItem, Player, GameNews, Game } from "../lib/types";
import { cn } from "@/lib/utils";
import axios from "axios";

//TODO: replace with persistant user data
const TEMP_USERDATA = "76561198045843433";

export function GamesNews() {
  const [gamesNews, setGamesNews] = useState<GameNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameNews | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    //TODO: finish loading api data into react frontend for viewing in console, then replace fake data
    function load() {
      axios
        .get("http://localhost:5011/circleNews/getNews", {
          params: { id: TEMP_USERDATA },
          signal: controller.signal,
        })
        .then((res) => setGamesNews(res.data))
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
  }, []); // empty array = run once on mount

  useEffect(() => {
    console.log(selectedGame);
  }, [selectedGame]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  const filteredNews: NewsItem[] = [];

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      {/* Recently played by friends */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Clock className="size-4" /> Recently played by friends
        </h2>
        <ul className="flex flex-col gap-3 h-170 overflow-y-scroll">
          {gamesNews.map((p) => {
            return (
              <li
                key={`${p.game.appid}`}
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
                    {p.game.title}
                  </p>
                  <div className="mt-auto flex items-center gap-2 overflow-x-auto pt-2">
                    {p.players.map((friendPlayer) => {
                      return <FriendCapsule friendPlayer={friendPlayer} />;
                    })}
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
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Newspaper className="size-4" /> Game news
        </h2>
        {selectedGame === null || selectedGame.news.length === 0 ? (
          <div>Select a game for News</div>
        ) : (
          <ul className="gap-3 overflow-y-scroll h-170">
            {selectedGame.news.map((n) => {
              return (
                <li
                  //key={n}
                  className="overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40"
                >
                  <article className="flex flex-col">
                    <div className="relative aspect-[460/215] w-full">
                      <Image
                        src={selectedGame.game.appImage || "/placeholder.svg"}
                        alt=""
                        fill
                        sizes="(max-width: 1024px) 100vw, 480px"
                        className="object-cover"
                      />
                      <span className="absolute left-2 top-2 rounded bg-popover/90 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur">
                        {selectedGame.game.title}
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-primary">
                          Author: {n.author}
                        </span>
                        <span aria-hidden>·</span>

                        <time>{new Date(n.date).toLocaleString()}</time>
                      </div>
                      <h3 className="mt-1 text-pretty font-semibold leading-snug text-foreground">
                        {n.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {n.contents.slice(0, 50)}
                      </p>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
