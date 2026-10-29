const axios = require("axios");
const mc = require("mongodb");
const fs = require("fs");
const { getOwnedGames, getGamesInfo } = require("../services/games");
const { getIds } = require("../services/friends");

const mongo = new mc.MongoClient("mongodb://localhost:27017", {
  serverApi: {
    version: mc.ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}).db("Steam-Stats");

//tries mongo first, then gets data from steam api
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

  // console.log(friendsData);
  // friendsData.then((results) => {
  //   console.log(results);
  //   Promise.all(results).then((resolutions) => console.log(resolutions));
  // });

  // return new Promise((resolve) => setTimeout(() => resolve(true), 500));

  // return Promise.all([playerData, globalData, friendsData]).then((results) => {
  //   console.log(results);
  //   return {};
  // });

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

const spAchievementData = (key, app, user) => {
  const pwg = mongo.collection("PlayerWithGame");

  return pwg.findOne({ steamId: user, appId: app }).then((record) => {
    let achievements;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (record === null || record.updatedAt < yesterday) {
      console.log("steam retrieval for app " + app + " and user " + user);
      achievements = retrieveAchievements(key, app, user);
    } else {
      console.log("database retreival");
      achievements = {
        achievements: record.achievements,
        totalAchieved: record.totalAchieved,
      };
    }

    return achievements;
  });
};

// const upsertGlobalStats = (id) => {
//   const

//   return axios
//     .get(
//       "https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/",
//       {
//         params: {
//           gameid: id,
//         },
//       },
//     )
//     .then((response) => response.data);
// };

const retrieveAchievements = (apiKey, appId, steamId) => {
  const achievements = {};
  const pwg = mongo.collection("PlayerWithGame");

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
        { steamId: steamId, appId: appId },
        {
          $setOnInsert: {
            steamId: steamId,
            appId: appId,
          },
          $set: {
            achievements: achievements.achievements,
            totalAchieved: achievements.totalAchieved,
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      );
      return achievements;
    })
    .catch((e) => {
      pwg.updateOne(
        { steamId: steamId, appId: appId },
        {
          $setOnInsert: {
            steamId: steamId,
            appId: appId,
          },
          $set: {
            achievements: null,
            totalAchieved: null,
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      );
      return null;
    });
};

//returns id if a person owns a given game, otherwise null
const doesFriendOwn = (key, friend, app) => {
  return getOwnedGames(key, friend).then((games) => {
    return games.some((game) => game.id + "" === app) ? friend : null;
  });
};

module.exports = { getAchievements, doesFriendOwn };
