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

//tries mongo first, then gets data from steam api
const getAchievements = (apiKey, appId, steamId) => {
  const pwg = mongo.collection("PlayerWithGame");

  return pwg.findOne({ steamId: steamId, appId: appId }).then((record) => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (record === null || record.updatedAt < yesterday) {
      return retrieveAchievements(apiKey, appId, steamId).then((resAch) => {
        pwg.updateOne(
          { steamId: steamId, appId: appId },
          {
            $setOnInsert: {
              steamId: steamId,
              appId: appId,
            },
            $set: {
              achievements: resAch.achievements,
              totalAchieved: resAch.totalAchieved,
              updatedAt: new Date(),
            },
          },
          { upsert: true },
        );
        return resAch;
      });
    } else {
      return {
        achievements: record.achievements,
        totalAchieved: record.totalAchieved,
      };
    }
  });
};

const retrieveAchievements = (apiKey, appId, steamId) => {
  const achievements = {};

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
    })
    .then(() => achievements);
};

const getGames = (apiKey, steamId) => {
  return axios
    .get("https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/", {
      params: {
        key: apiKey,
        steamid: steamId,
        include_appinfo: 1,
        include_played_free_games: 1,
      },
    })
    .then((res) => res.data.response.games)
    .then((gamesOwned) => {
      const games = [];

      for (const game of gamesOwned) {
        if (Object.hasOwn(game, "has_community_visible_stats")) {
          games.push({
            appid: game.appid,
            title: game.name,
            playtime: game.playtime_forever,
            lastPlayed: game.rtime_last_played,
            appImage:
              "https://media.steampowered.com/steamcommunity/public/images/apps/" +
              game.appid +
              "/" +
              game.img_icon_url +
              ".jpg",
          });
        }
      }

      return games;
    });
};

module.exports = { getAchievements, getGames };
