"use client";

import { useEffect, useState } from "react";
import { Trophy, Lock, Check, Globe, Users } from "lucide-react";
import { AchievementsData, Achievement, QuickGameInfo } from "@/lib/types";
import { GameCapsule } from "@/components/game-capsule";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import axios from "axios";
import { TotalAchievePercent } from "./ui/total-achieve-percent";
import { AchievementsPane } from "./achievements-pane";

export const per = (a: AchievementsData) => {
  return Math.round((a.totalAchieved / a.achievements.length) * 100);
};

export function AchievementsView() {
  const [selectedGame, setSelectedGame] = useState<QuickGameInfo | null>(null);
  const [games, setGames] = useState<QuickGameInfo[] | null>(null);
  const [achievementsData, setAchievementsData] =
    useState<AchievementsData | null>(null);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [achievementsLoading, setAchievementsLoading] = useState(true);
  const [achievementsError, setAchievementsError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();

    //TODO: finish loading api data into react frontend for viewing in console, then replace fake data
    function load() {
      axios
        .get("http://localhost:5011/achievements/getGames/", {
          params: {
            apiKey: process.env.REACT_APP_API_KEY,
            steamId: 76561198045843433,
          },
          signal: controller.signal,
        })
        .then((res) => {
          const gamesUnformated = res.data;
          for (const game of gamesUnformated)
            setGames(
              res.data.sort((a: QuickGameInfo, b: QuickGameInfo) =>
                a.title.localeCompare(b.title),
              ),
            );
        })
        .catch((err) => {
          if (!axios.isCancel(err)) {
            setGamesError("Failed to load achievements");
          }
        })
        .finally(() => {
          setGamesLoading(false);
          console.log("Games loaded");
        });
    }

    load();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedGame) return;

    const controller = new AbortController();

    //TODO: finish loading api data into react frontend for viewing in console, then replace fake data
    function load() {
      axios
        .get<{ player: AchievementsData }>(
          "http://localhost:5011/achievements/getAchievements/",
          {
            params: {
              apiKey: process.env.REACT_APP_API_KEY,
              appId: selectedGame?.appId,
              steamId: 76561198045843433,
            },
            signal: controller.signal,
          },
        )
        .then((res) => setAchievementsData(res.data.player))
        .catch((err) => {
          if (!axios.isCancel(err)) {
            setAchievementsError("Failed to load achievements");
          }
        })
        .finally(() => {
          setAchievementsLoading(false);
          console.log("Achieves loaded");
        });
    }

    load();
    return () => controller.abort();
  }, [selectedGame]);

  // const stats = useMemo(() => {
  //   const total = list.length;
  //   const unlocked = list.filter((a) => a.unlockedByUser);
  //   const completion = total === 0 ? 0 : (unlocked.length / total) * 100;

  //   // Rarity-based standing: unlocking rarer achievements => stronger standing.
  //   const globalRarity = avg(unlocked.map((a) => 100 - a.globalPct));
  //   const friendsRarity = avg(unlocked.map((a) => 100 - a.friendsPct));
  //   const globalTopPct = Math.max(1, Math.round(100 - globalRarity));
  //   const friendsTopPct = Math.max(1, Math.round(100 - friendsRarity));

  //   const globalAvgCompletion = avg(list.map((a) => a.globalPct));
  //   const friendsAvgCompletion = avg(list.map((a) => a.friendsPct));

  //   const rarest = unlocked.reduce<Achievement | null>(
  //     (min, a) => (min === null || a.globalPct < min.globalPct ? a : min),
  //     null,
  //   );

  //   return {
  //     total,
  //     unlockedCount: unlocked.length,
  //     completion,
  //     globalTopPct,
  //     friendsTopPct,
  //     globalAvgCompletion,
  //     friendsAvgCompletion,
  //     rarest,
  //   };
  // }, [list]);

  console.log("Games are:");
  console.log(games);
  console.log("Achieves are:");
  console.log(achievementsData);

  if (gamesLoading) return <div>Loading...</div>;
  if (achievementsError) return <div>Achievements error encountered</div>;
  if (gamesError) return <div>Games error encountered</div>;

  return (
    <div>
      {/*  game selector */}
      <Select
        value={selectedGame?.title}
        onValueChange={(title) => {
          setSelectedGame(games?.find((game) => game.title === title) ?? null);
          console.log(games?.find((game) => game.title === title) ?? null);
        }}
      >
        <SelectTrigger className="bg-card">
          <SelectValue placeholder="Select a game" />
        </SelectTrigger>
        <SelectContent>
          {games?.map((game) => (
            <SelectItem key={game.title} value={game.title}>
              {game.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {achievementsData && selectedGame && (
        <AchievementsPane
          achievementsData={achievementsData}
          selectedGame={selectedGame}
        />
      )}
    </div>
  );
}
