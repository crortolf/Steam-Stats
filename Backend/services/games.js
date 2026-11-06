const axios = require("axios");
const fs = require("fs");
const mc = require("mongodb");

const mongo = new mc.MongoClient("mongodb://localhost:27017", {
  serverApi: {
    version: mc.ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}).db("Steam-Stats");

const getGamesInfo = (apiKey, appIds) => {
  const games = mongo.collection("Games");
  const gamesData = [];

  for (const appId of appIds) {
    gamesData.push(
      games
        .findOne({ _id: Number(appId) })
        .then((record) => {
          if (record === null) {
            fs.appendFileSync(
              "attemptedRetreivals.txt",
              "steam retreival with key " + apiKey + " for app " + appId,
            );
            return retrieveGameInfo(apiKey, appId).then((retreivedGameInfo) => {
              if (retreivedGameInfo === undefined) return null;
              const { id, ...resGame } = retreivedGameInfo;
              const newGame = {
                _id: id,
                ...resGame,
              };
              games.insertOne(newGame);

              return resGame;
            });
          }
          console.log("database retreival");
          return record;
        })
        .then(({ _id, ...resRecord }) => {
          return {
            id: _id,
            ...resRecord,
          };
        })
        .catch((e) => console.log(e)),
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
          return resAch.data.game.availableGameStats.achievements;
        })
        .then((achievements) =>
          insertAchivementsPercentage(appId, achievements),
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
        })
        .catch((e) => console.log(e));
    });
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

const getOwnedGames = (key, id) => {
  const owned = mongo.collection("OwnedGames");

  try {
    return owned.findOne({ _id: id }).then((record) => {
      const yesterday = new Date(Date() - 24 * 60 * 60 * 1000);
      if (record === null || record.lastUpdated < yesterday) {
        console.log("steam retreival");
        return axios
          .get(
            "https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/",
            {
              params: {
                key: key,
                steamid: id,
                include_appinfo: true,
              },
            },
          )
          .then((response) => response.data.response.games)
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
            owned.updateOne(
              { _id: id },
              {
                $setOnInsert: {
                  _id: id,
                },
                $set: {
                  updatedAt: new Date(),
                  games: mappedGames,
                },
              },
              { upsert: true },
            );
            return mappedGames;
          });
      } else {
        console.log("database retreival");
        return record.games;
      }
    });
  } catch {}
};

module.exports = { getGamesInfo, getOwnedGames };
