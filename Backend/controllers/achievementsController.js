const axios = require("axios");
const mc = require("mongodb");
const fs = require("fs");
const { getOwnedGames, getGamesInfo } = require("../services/games");
const { getIds } = require("../services/friends");
const { isStale, cacheFailure, keyScope } = require("../services/cache");

const mongo = new mc.MongoClient("mongodb://localhost:27017", {
  serverApi: {
    version: mc.ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}).db("Steam-Stats");

/**
 * Builds everything the achievements page shows for one game: the player's
 * achievements, how rare each is worldwide, and how many of their friends have it.
 * Each piece is read from mongo first and from steam when it's missing or stale.
 *
 * In parallel, gets the player's achievements (spAchievementData), the game's
 * details and global percentages (getGamesInfo), and the friends who own the
 * game (getIds + doesFriendOwn), then each owning friend's achievements. It
 * merges them into one object keyed by achievement, counting how many friends
 * unlocked each, and averages the global percentages.
 *
 * @param {string} apiKey - The signed in user's steam api key.
 * @param {string} appId - The game's steam app id.
 * @param {string} steamId - The player's 64-bit steam id.
 * @returns {Promise<object>} The game's details plus:
 *   - achievements: { [apiName]: { achieved, time, name, description, icon,
 *     icongray, globalPercent, friendsAchieved } }
 *   - totalAchieves, totalAchieved: how many there are and how many the player has
 *   - totalFriendsScanned, totalFriendsAchievements: friends whose stats were
 *     readable, and their unlocks added up
 *   - totalGlobalAchievesPercent: the average global unlock rate
 *   Rejects if the player's stats or the game's details aren't available.
 */
const getAchievements = (apiKey, appId, steamId) => {
  const playerData = spAchievementData(apiKey, appId, steamId);
  const globalData = getGamesInfo(apiKey, [appId]);
  const friendsData = getIds(apiKey, steamId).then((friends) => {
    const owns = friends.map((f) => doesFriendOwn(apiKey, f, appId));
    return Promise.all(owns).then((owners) => {
      owners = owners.filter((f) => f !== null);
      return owners.map((owner) => spAchievementData(apiKey, appId, owner));
    });
  });

  return friendsData.then((friendPromises) => {
    return Promise.all([playerData, globalData, ...friendPromises]).then(
      ([playerResults, globalResults, ...friendResults]) => {
        const { achievements, ...gameData } = globalResults[0];

        const combinedAchievementData = {
          totalFriendsAchievements: 0,
          totalFriendsScanned: 0,
          totalAchieves: 0,
          totalAchieved: playerResults.totalAchieved,
          achievements: {},
          totalGlobalAchievesPercent: 0,
          ...gameData,
        };

        //console.log(globalResults);

        for (const { aId, ...data } of playerResults.achievements) {
          combinedAchievementData.totalAchieves++;
          combinedAchievementData.achievements[aId] = {
            ...data,
            friendsAchieved: 0,
          };
        }

        for (const { name, icon, icongray, globalPercent } of globalResults[0]
          .achievements) {
          combinedAchievementData.achievements[name].icon = icon;
          combinedAchievementData.achievements[name].icongray = icongray;
          combinedAchievementData.achievements[name].globalPercent =
            globalPercent;
          combinedAchievementData.totalGlobalAchievesPercent +=
            parseInt(globalPercent);
        }

        //console.log(friendResults);
        friendResults = friendResults.filter(
          (fr) => fr !== null && fr.achievements !== null,
        );

        for (const friendAchievementsData of friendResults) {
          combinedAchievementData.totalFriendsAchievements +=
            friendAchievementsData.totalAchieved;
          combinedAchievementData.totalFriendsScanned++;
          for (const { aId, achieved } of friendAchievementsData.achievements) {
            if (achieved === 1)
              combinedAchievementData.achievements[aId].friendsAchieved++;
          }
        }

        console.log(combinedAchievementData.totalGlobalAchievesPercent);

        combinedAchievementData.totalGlobalAchievesPercent = Number(
          (
            combinedAchievementData.totalGlobalAchievesPercent /
            combinedAchievementData.totalAchieves
          ).toFixed(1),
        );

        console.log(combinedAchievementData.totalGlobalAchievesPercent);
        // fs.writeFileSync(
        //   "output.txt",
        //   JSON.stringify(combinedAchievementData, null, 2),
        // );

        return combinedAchievementData;
      },
    );
  });
};

/**
 * Gets one player's achievements in one game, from the cache when it's fresh
 * and from steam otherwise.
 *
 * Looks up the PlayerWithGame record for this key, player and game. If it's
 * missing or stale (see isStale), asks steam with retrieveAchievements and
 * falls back on the stored data if that fails.
 *
 * Achievements are cached per api key (see keyScope in cache.js), so
 * friends-only achievements read with one user's key aren't shown to others.
 *
 * @param {string} key - The signed in user's steam api key.
 * @param {string} app - The game's steam app id.
 * @param {string} user - The 64-bit steam id of the player whose achievements to get.
 * @returns {Promise<{achievements: object[], totalAchieved: number}|null>}
 *   Each achievement as { aId, achieved (1 or 0), time, name, description },
 *   and how many are unlocked; null if their stats are private or unavailable.
 */
const spAchievementData = (key, app, user) => {
  const pwg = mongo.collection("PlayerWithGame");

  return pwg
    .findOne({ viewer: keyScope(key), steamId: user, appId: app })
    .then((record) => {
      //a record holding only a cached failure has no achievements yet
      const stored =
        record?.achievements === undefined
          ? null
          : {
              achievements: record.achievements,
              totalAchieved: record.totalAchieved,
            };

      if (isStale(record)) {
        console.log("steam retrieval for app " + app + " and user " + user);
        return retrieveAchievements(key, app, user).then(
          (achievements) => achievements ?? stored,
        );
      }

      console.log("database retreival");
      return stored;
    });
};

/**
 * Asks steam for one player's achievements in one game and caches them under this key.
 *
 * Calls steam's GetPlayerAchievements, turns each unlock time into a readable
 * date, counts the unlocked ones, and saves the result in the background. If
 * steam fails (usually private stats), records the failure.
 *
 * @param {string} apiKey - The signed in user's steam api key.
 * @param {string} appId - The game's steam app id.
 * @param {string} steamId - The player's 64-bit steam id.
 * @returns {Promise<{achievements: object[], totalAchieved: number}|null>} The
 *   same shape as spAchievementData; null if the request failed. Never rejects.
 */
const retrieveAchievements = (apiKey, appId, steamId) => {
  const achievements = {};
  const pwg = mongo.collection("PlayerWithGame");
  const filter = { viewer: keyScope(apiKey), steamId: steamId, appId: appId };

  return axios
    .get(
      "https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/",
      {
        params: {
          key: apiKey,
          appid: appId,
          steamid: steamId,
          l: "english",
        },
      },
    )
    .then((res) => {
      achievements.achievements = [];
      achievements.totalAchieved = 0;
      for (const achievement of res.data.playerstats.achievements) {
        achievements.totalAchieved += achievement.achieved;
        achievements.achievements.push({
          aId: achievement.apiname,
          achieved: achievement.achieved,
          time: new Date(achievement.unlocktime * 1000).toLocaleDateString(
            "en-US",
            {
              dateStyle: "long",
            },
          ),
          name: achievement.name,
          description: achievement.description,
        });
      }
      pwg.updateOne(
        filter,
        {
          $setOnInsert: filter,
          $set: {
            achievements: achievements.achievements,
            totalAchieved: achievements.totalAchieved,
            updatedAt: new Date(),
          },
          $unset: { failedAt: "" },
        },
        { upsert: true },
      ).catch((error) => console.log(error.message));
      return achievements;
    })
    .catch((e) => {
      cacheFailure(pwg, filter);
      return null;
    });
};

/**
 * Checks whether a player owns a game.
 *
 * Reads their library with getOwnedGames (cache first) and looks for the app id.
 *
 * @param {string} key - The signed in user's steam api key.
 * @param {string} friend - The 64-bit steam id of the player to check.
 * @param {string} app - The game's steam app id, as a string.
 * @returns {Promise<string|null>} The player's steam id if they own it, otherwise null.
 */
const doesFriendOwn = (key, friend, app) => {
  return getOwnedGames(key, friend).then((games) => {
    return games.some((game) => game.id + "" === app) ? friend : null;
  });
};

module.exports = { getAchievements, doesFriendOwn, spAchievementData };
