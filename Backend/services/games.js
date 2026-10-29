const axios = require("axios");
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
            console.log("steam retreival");
            return retrieveGameInfo(apiKey, appId).then(
              ({ id, ...resGame }) => {
                const newGame = {
                  _id: id,
                  ...resGame,
                };
                games.insertOne(newGame);

                return resGame;
              },
            );
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

// const getIdsTitles = (key, ids) => {
//   const idTitle = [];

//   getGamesInfo(key, ids).then((games) => {
//     for (const game of games) {
//       idTitle.push([game.id, game.name]);
//     }
//   });

//   return idTitle;
// };

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

// const games = mongo.collection("Games");
// const players = mongo.collection("Players");

// return players.findOne({_id: id}).then(playerRecord => {
//   const yesterday = new Date(Date() - 24 * 60 * 60 * 1000);
//   if (playerRecord === null || playerRecord.games == null || playerRecord.games.lastUpdated === null || playerRecord.games.lastUpdated < yesterday) {
//     return axios
//   .get("https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/", {
//     params: {
//       steamid: id,
//       key: key,
//       include_appinfo: true,
//     },
//   })
//   .then((results) => {
//     results.response.games.forEach(({ appid, name }) => {
//       return games.find({ _id: appid }).then((record) => {
//         if (record === null) {
//           games.insertOne({ _id: appid, title: name });
//         }
// })

// return axios
//   .get("https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/", {
//     params: {
//       steamid: id,
//       key: key,
//       include_appinfo: true,
//     },
//   })
//   .then((results) => {
//     results.response.games.forEach(({ appid, name }) => {
//       return games.find({ _id: appid }).then((record) => {
//         if (record === null) {
//           const newGame = { _id: appid, title: name };
//           games.insertOne(newGame);
//           return { id: appid, title: name };
//         }
//         return { id: appid, title: name };
//       });
//     });
//   });
//};

module.exports = { getGamesInfo, getOwnedGames };
