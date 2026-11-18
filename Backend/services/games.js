const axios = require("axios");
const fs = require("fs");
const mc = require("mongodb");
const { isStale, cacheFailure, scopedId } = require("./cache");

const mongo = new mc.MongoClient("mongodb://localhost:27017", {
  serverApi: {
    version: mc.ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}).db("Steam-Stats");

/**
 * Asks steam for a player's game library. Always a steam request; nothing is cached here.
 *
 * Calls steam's GetOwnedGames with the user's own key and unwraps the response.
 *
 * @param {string} key - The signed in user's steam api key.
 * @param {string} id - The 64-bit steam id of the player whose library to get.
 * @param {object} [extraParams] - More query parameters for steam, ex: { include_appinfo: true }
 *   to get each game's name.
 * @returns {Promise<{game_count?: number, games?: object[]}>} Steam's response
 *   object. games is missing if the library is hidden.
 */
const requestOwnedGames = (key, id, extraParams = {}) =>
  axios
    .get("https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/", {
      params: { key: key, steamid: id, ...extraParams },
    })
    .then((response) => response.data.response);

/**
 * Gets store details and achievements for several games, from the cache when
 * it's fresh and from steam otherwise.
 *
 * Looks each game up in the Games collection in parallel. Missing or stale
 * records (see isStale) are fetched with retrieveGameInfo and saved; if that
 * fails, the failure is recorded and the stored record is used instead. The
 * cache's _id and timestamps are swapped for a plain id before returning.
 * Game data is the same for everyone, so it isn't cached per key.
 *
 * @param {string} apiKey - A steam api key, needed for the achievement schema.
 * @param {(string|number)[]} appIds - Steam app ids of the games.
 * @returns {Promise<(object|null|undefined)[]>} One entry per app id, in the same
 *   order: { id, name, icon, image, description, publishDate, developers,
 *   publishers, achievements }, or null if steam has no data for that game
 *   (undefined if the database read itself failed).
 */
const getGamesInfo = (apiKey, appIds) => {
  const games = mongo.collection("Games");
  const gamesData = [];

  for (const appId of appIds) {
    gamesData.push(
      games
        .findOne({ _id: Number(appId) })
        .then((record) => {
          if (isStale(record)) {
            console.log("steam retreival for app " + appId);
            return retrieveGameInfo(apiKey, appId).then((retreivedGameInfo) => {
              //steam request failed, fall back on whatever we have stored
              if (retreivedGameInfo === undefined) {
                cacheFailure(games, { _id: Number(appId) });
                return record;
              }
              const { id, ...resGame } = retreivedGameInfo;
              const newGame = {
                _id: id,
                ...resGame,
              };
              games
                .updateOne(
                  { _id: id },
                  {
                    $setOnInsert: {
                      _id: id,
                    },
                    $set: {
                      ...resGame,
                      updatedAt: new Date(),
                    },
                    $unset: { failedAt: "" },
                  },
                  { upsert: true },
                )
                .catch((e) => console.log(e.message));

              return newGame;
            });
          }
          console.log("database retreival");
          return record;
        })
        .then((record) => {
          //a record without a name only holds a cached failure
          if (record === null || record.name === undefined) return null;
          const { _id, updatedAt, failedAt, ...resRecord } = record;
          return {
            id: _id,
            ...resRecord,
          };
        })
        .catch((e) => console.log(e.message)),
    );
  }

  return Promise.all(gamesData);
};

/**
 * Builds one game's details from steam. Always steam requests; the caller caches the result.
 *
 * Gets the store page data from appdetails, then the achievement list from
 * GetSchemaForGame, adds each achievement's global unlock rate with
 * insertAchivementsPercentage, and picks out the fields the site uses.
 *
 * @param {string} apiKey - A steam api key for GetSchemaForGame.
 * @param {string|number} appId - The game's steam app id.
 * @returns {Promise<object|undefined>} { id, name, icon, image, description,
 *   publishDate, developers, publishers, achievements }, or undefined if any
 *   request failed.
 */
const retrieveGameInfo = (apiKey, appId) => {
  return axios
    .get("https://store.steampowered.com/api/appdetails/", {
      params: { appids: appId },
    })
    .then((resGame) => resGame.data[appId].data)
    .then((game) => {
      return axios
        .get(
          "https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/",
          {
            params: { key: apiKey, appid: appId, l: "english" },
          },
        )
        .then((resAch) => {
          //games without achievements come back with no availableGameStats
          return resAch.data.game?.availableGameStats?.achievements ?? [];
        })
        .then((achievements) =>
          achievements.length === 0
            ? []
            : insertAchivementsPercentage(appId, achievements),
        )
        .then((achievements) => {
          return {
            id: game.steam_appid,
            name: game.name,
            icon: game.capsule_imagev5,
            image: game.header_image,
            description: game.short_description,
            publishDate: game.release_date.date,
            developers: game.developers,
            publishers: game.publishers,
            achievements: achievements,
          };
        });
    })
    .catch((e) => console.log("failed on app " + appId + ": " + e.message));
};

/**
 * Adds how many players worldwide have unlocked each achievement.
 *
 * Asks steam's GetGlobalAchievementPercentagesForApp (no key needed), maps the
 * results by achievement name, and sets globalPercent on each achievement.
 * The array passed in is changed in place.
 *
 * @param {string|number} appId - The game's steam app id.
 * @param {{name: string}[]} achievements - The game's achievements from its schema.
 * @returns {Promise<object[]>} The same achievements, each with globalPercent
 *   (a percentage, or undefined if steam didn't list it). Rejects if the request fails.
 */
const insertAchivementsPercentage = (appId, achievements) => {
  const percentages = {};
  console.log("steam retreival inserting global percentages for " + appId);

  return axios
    .get(
      "https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/",
      { params: { gameid: appId } },
    )
    .then((resPer) => {
      for (const percent of resPer.data.achievementpercentages.achievements) {
        percentages[percent.name] = percent.percent;
      }
      for (const ach of achievements) {
        ach.globalPercent = percentages[ach.name];
      }
      return achievements;
    });
};

//have to get the player. if empty or old, retreive player
//if the games list exists and is not old, then use
//else, retreive games list. Update all games in list <- maybe save for later

/**
 * Gets a player's game library, from the cache when it's fresh and from steam otherwise.
 *
 * Looks up the OwnedGames record for this key and player. If it's missing or
 * stale (see isStale), it asks steam with requestOwnedGames (including each
 * game's name), keeps the fields the site uses, and saves them with a new
 * updatedAt. If steam fails, it records the failure and falls back on the
 * stored library.
 *
 * Libraries are cached per api key (see keyScope in cache.js), so a
 * friends-only library read with one user's key is never shown to another user.
 *
 * @param {string} key - The signed in user's steam api key.
 * @param {string} id - The 64-bit steam id of the player whose library to get.
 * @returns {Promise<{id: number, title: string, playtime: number, lastPlayed: number}[]>|undefined}
 *   Each owned game's app id, name, minutes played and last played time (unix
 *   seconds); empty if the library is hidden. undefined only if the lookup
 *   couldn't even start.
 */
const getOwnedGames = (key, id) => {
  const owned = mongo.collection("OwnedGames");
  const _id = scopedId(key, id);

  try {
    return owned.findOne({ _id }).then((record) => {
      if (isStale(record)) {
        console.log("steam retreival");
        return requestOwnedGames(key, id, { include_appinfo: true })
          .then((response) => response?.games)
          .then((retrievedGames) => {
            const mappedGames =
              retrievedGames === null || retrievedGames === undefined
                ? []
                : retrievedGames.map(
                    ({ appid, name, playtime_forever, rtime_last_played }) => {
                      return {
                        id: appid,
                        title: name,
                        playtime: playtime_forever,
                        lastPlayed: rtime_last_played,
                      };
                    },
                  );
            owned
              .updateOne(
                { _id },
                {
                  $setOnInsert: {
                    _id,
                    steamId: id,
                  },
                  $set: {
                    updatedAt: new Date(),
                    games: mappedGames,
                  },
                  $unset: { failedAt: "" },
                },
                { upsert: true },
              )
              .catch((e) => console.log(e.message));
            return mappedGames;
          })
          .catch((e) => {
            //steam request failed, fall back on whatever we have stored
            console.log("failed on owned games of " + id + ": " + e.message);
            cacheFailure(owned, { _id });
            return record?.games ?? [];
          });
      } else {
        console.log("database retreival");
        return record.games ?? [];
      }
    });
  } catch {}
};

/**
 * Makes text safe to use inside a regular expression.
 *
 * Puts a backslash before every character that has a special meaning in a regex.
 *
 * @param {string} text - Text that should be matched literally, ex: "C++".
 * @returns {string} The escaped text, ex: "C\\+\\+".
 */
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Searches the games the site already has store data for, by name. Reads only
 * the cache, never steam.
 *
 * Finds Games records whose name contains the query, ignoring case, and
 * fetches only their id, name and banner.
 *
 * @param {string} query - Text the game's name must contain.
 * @param {number} limit - The most games to return.
 * @returns {Promise<{id: number, name: string, image: string}[]>} The matching games.
 */
const searchCachedGames = (query, limit) =>
  mongo
    .collection("Games")
    .find(
      {
        name: { $regex: escapeRegex(query), $options: "i" },
      },
      { projection: { _id: 1, name: 1, image: 1 } },
    )
    .limit(limit)
    .toArray()
    .then((games) =>
      games.map(({ _id, name, image }) => ({ id: _id, name, image })),
    );

module.exports = {
  getGamesInfo,
  getOwnedGames,
  requestOwnedGames,
  searchCachedGames,
};
