"use client";

import { useEffect, useState } from "react";
import { Trophy, Lock, Check, Globe, Users } from "lucide-react";
import {
  AchievementsData,
  Achievement,
  QuickGameInfo,
  SumAchievementData,
} from "@/lib/types";
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
import { useAuth } from "@/lib/auth";

export const per = (a: SumAchievementData) => {
  return a.totalAchieves > 0
    ? Math.round((a.totalAchieved / a.totalAchieves) * 100)
    : 0;
};

export function AchievementsView() {
  //RequireSteamKey only renders this once the user has a steam id
  const steamId = useAuth().user?.steamId ?? null;
  const [selectedGame, setSelectedGame] = useState<string[] | null>(null);
  const [games, setGames] = useState<string[][] | null>(null);
  const [achievementsData, setAchievementsData] =
    useState<SumAchievementData | null>(null);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [achievementsLoading, setAchievementsLoading] = useState(true);
  const [achievementsError, setAchievementsError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (steamId === null) return;
    const controller = new AbortController();

    //TODO: finish loading api data into react frontend for viewing in console, then replace fake data
    function load() {
      axios
        .get("http://localhost:5011/achievements/getIdsTitles/", {
          params: {
            id: steamId,
          },
          withCredentials: true,
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
  }, [steamId]);

  useEffect(() => {
    if (!selectedGame || steamId === null) return;

    const controller = new AbortController();

    //TODO: finish loading api data into react frontend for viewing in console, then replace fake data
    function load() {
      if (selectedGame !== null) {
        axios
          .get("http://localhost:5011/achievements/getAchievements/", {
            params: {
              appId: selectedGame[0],
              steamId: steamId,
            },
            withCredentials: true,
            signal: controller.signal,
          })
          .then((res) => {
            setAchievementsData(res.data);
          })
          .catch((err) => {
            if (!axios.isCancel(err)) {
              setAchievementsError("Failed to load achievements");
            }
          })
          .finally(() => {
            setAchievementsLoading(false);
            console.log("Achievements loaded");
          });
      }
    }

    load();
    return () => controller.abort();
  }, [selectedGame, steamId]);

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
  console.log("Achieves Data is:");
  console.log(achievementsData);

  if (gamesLoading) return <div>Loading...</div>;

  // Errors are shown under the selector rather than replacing it, so another
  // game can still be picked after one fails to load.
  return (
    <div>
      {/*  game selector */}
      <Select
        // null (not undefined) means "nothing selected", so the Select stays
        // controlled from the first render instead of switching later
        value={selectedGame?.[1] ?? null}
        onValueChange={(title) => {
          const newSelectedGame =
            games?.find((game) => game[1] === title) ?? null;
          if (newSelectedGame !== null) {
            setAchievementsLoading(true);
            // Drop the previous game's error and data so neither shows for
            // the newly selected game.
            setAchievementsError(null);
            setAchievementsData(null);
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
      {gamesError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {gamesError}. Try reloading the page.
        </p>
      )}
      {achievementsError && selectedGame && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {achievementsError} for {selectedGame[1]}. Choose another game, or
          reload the page to try again.
        </p>
      )}
      {!achievementsLoading && achievementsData && selectedGame && (
        <div>
          <br />
          <AchievementsPane achievementsData={achievementsData} />
        </div>
      )}
    </div>
  );
}
