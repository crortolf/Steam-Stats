const axios = require("axios");
const fs = require("fs");

const getAchievements = (apiKey, appId, steamId) => {
  const achievements = {};

  const playerRequest = axios
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
      achievements.player = {};
      achievements.player.achievements = [];
      achievements.player.totalAchieved = 0;
      for (const achievement of res.data.playerstats.achievements) {
        achievements.player.totalAchieved += achievement.achieved;
        achievements.player.achievements.push({
          achieved: achievement.achieved,
          time: achievement.unlocktime,
          name: achievement.name,
          description: achievement.description,
        });
      }
    });

  return Promise.all([playerRequest]).then((res) => achievements);
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
