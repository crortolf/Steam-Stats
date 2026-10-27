const axios = require("axios");
const mc = require("mongodb");

const mongo = new mc.MongoClient("mongodb://localhost:27017", {
  serverApi: {
    version: mc.ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}).db("Steam-Stats");

const getGameInfo = (apiKey, appIds) => {
  const games = mongo.collection("Games");
  const gamesData = [];

  for (const appId of appIds) {
    gamesData.push(
      games
        .findOne({ _id: Number(appId) })
        .then((record) => {
          if (record === null) {
            console.log(record);
            return retrieveGameInfo(apiKey, appId).then((resGame) => {
              const newGame = {
                _id: resGame.id,
                name: resGame.name,
                icon: resGame.icon,
                image: resGame.image,
                description: resGame.description,
                publishDate: resGame.publishDate,
                publishers: resGame.publishers,
                developers: resGame.developers,
                achievements: resGame.achievements,
              };
              games.insertOne(newGame);

              return resGame;
            });
          } else {
            console.log("db check");
            return {
              id: record._id,
              name: record.name,
              icon: record.icon,
              image: record.image,
              description: record.description,
              publishDate: record.publishDate,
              publishers: record.publishers,
              developers: record.developers,
              achievements: record.achievements,
            };
          }
        })
        .catch((e) => console.log(e)),
    );
  }

  console.log(gamesData);

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
        });
    });
};

const insertAchivementsPercentage = (appId, achievements) => {
  const percentages = {};

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

module.exports = { getGameInfo };
