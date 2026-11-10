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

//asks steam for a player's library with the user's own key
//resolves to steam's response object; games is missing if the library is hidden
const requestOwnedGames = (key, id, extraParams = {}) =>
  axios
    .get("https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/", {
      params: { key: key, steamid: id, ...extraParams },
    })
    .then((response) => response.data.response);

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

//cached per api key (see keyScope in cache.js): a friends-only library read
//with one user's key is never shown to another user
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

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

//games the site already has store data for, matched by name; reads only the
//cache, never steam
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
