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
  const [selectedGame, setSelectedGame] = useState<string[] | null>(null);
  const [games, setGames] = useState<string[][] | null>(null);
  const [playerAchievementsData, setPlayerAchievementsData] =
    useState<AchievementsData | null>(null);
  const [globalAchievementsData, setGlobalAchievementsData] = useState(null);
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
        .get("http://localhost:5011/achievements/getIdsTitles/", {
          params: {
            key: process.env.NEXT_PUBLIC_API_KEY,
            id: process.env.NEXT_PUBLIC_CF_ID,
          },
          signal: controller.signal,
        })
        .then((res) => {
          setGames(
            res.data.sort((a: string[], b: string[]) =>
              a[1].localeCompare(b[1]),
            ),
          );
        })
        .catch((err) => {
          console.log(err);
          if (!axios.isCancel(err)) {
            setGamesError("Failed to load games");
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
      console.log(selectedGame ? selectedGame[0] : undefined);
      axios
        .get("http://localhost:5011/achievements/getAchievements/", {
          params: {
            apiKey: process.env.NEXT_PUBLIC_API_KEY,
            appId: selectedGame ? selectedGame[0] : undefined,
            steamId: process.env.NEXT_PUBLIC_CF_ID,
          },
          signal: controller.signal,
        })
        .then((res) => {
          setPlayerAchievementsData(res.data);
          axios
            .get(
              "http://localhost:5011/achievements/getGameAchievementsInfo/",
              {
                params: {
                  key: process.env.NEXT_PUBLIC_API_KEY,
                  id: selectedGame ? selectedGame[0] : undefined,
                },
              },
            )
            .then((response) => {
              setGlobalAchievementsData(response.data);
            })
            .finally(() => {
              setAchievementsLoading(false);
              console.log("Achieves loaded");
            });
        })
        .catch((err) => {
          if (!axios.isCancel(err)) {
            setAchievementsError("Failed to load achievements");
          }
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
  console.log(playerAchievementsData);
  console.log("Global Data is:");
  console.log(globalAchievementsData);

  if (gamesLoading) return <div>Loading...</div>;
  if (achievementsError) return <div>Achievements error encountered</div>;
  if (gamesError) return <div>Games error encountered</div>;

  return (
    <div>
      {/*  game selector */}
      <Select
        value={selectedGame?.[1]}
        onValueChange={(title) => {
          const newSelectedGame =
            games?.find((game) => game[1] === title) ?? null;
          if (newSelectedGame !== null) {
            setAchievementsLoading(true);
            setSelectedGame(newSelectedGame);
          }
        }}
      >
        <SelectTrigger className="bg-card">
          <SelectValue placeholder="Select a game" />
        </SelectTrigger>
        <SelectContent>
          {games?.map((game) => (
            <SelectItem key={game[0]} value={game[1]}>
              {game[1]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!achievementsLoading && playerAchievementsData && selectedGame && (
        <AchievementsPane
          achievementsData={playerAchievementsData}
          selectedGame={selectedGame}
          globalGameStatistics={globalAchievementsData}
        />
      )}
    </div>
  );
}
