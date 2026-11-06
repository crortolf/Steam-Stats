const axios = require("axios");
const fs = require("fs");
const { getGamesInfo } = require("../services/games");
const { getPlayersInfo } = require("../services/players");
const { getIds } = require("../services/friends");
const mc = require("mongodb");

const mongo = new mc.MongoClient("mongodb://localhost:27017", {
  serverApi: {
    version: mc.ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}).db("Steam-Stats");

const getNews = (apiKey, steamId) => {
  //map going from gameid -> friend ids of those that played recently
  const friendGames = {};
  const avatars = {};

  //request friends list for the given id
  return getIds(apiKey, steamId)
    .then((friendsList) => {
      const populations = [];
      //iterate through friends and  populate the playing map
      for (const friend of friendsList) {
        //push promises for a friend's recently played data
        populations.push(updatePlayingMap(apiKey, friend, friendGames));
      }
      //push promise for all avatars and names of friends
      populations.push(getAvatars(apiKey, friendsList, avatars));
      return Promise.all(populations).then(() => {
        console.log("got here");
        console.log(JSON.stringify());
        const newsPromises = [];
        //create, populate, display all news items
        for (const appid in friendGames) {
          //push promises for game news
          console.log("pushing promise for " + appid);
          newsPromises.push(
            requestInfoNews(apiKey, appid, friendGames[appid], avatars),
          );
        }

        return Promise.all(newsPromises);
      });
    })
    .catch((error) => console.log(error));
};

//makes a request for all data relating to the friends of the user so we can get their avatars
//avatars gives all friends' names and profile pics
const getAvatars = (key, friendsList, avatars) => {
  return getPlayersInfo(key, friendsList)
    .then((res) => {
      fs.writeFileSync(
        "getPlayersInfoResult.txt",
        JSON.stringify(res, null, 2),
      );
      for (const user of res.filter((friend) => friend.image !== null)) {
        avatars[user.id] = {
          avatar: user.image,
          name: user.name,
        };
      }
    })
    .then((res) => {
      fs.writeFileSync("getAvatars.txt", JSON.stringify(avatars, null, 2));
      return res;
    })
    .catch((error) => {
      fs.writeFileSync("circleNewsError.txt", JSON.stringify(error, null, 2));
      console.log("see error in circleNewsError.txt");
    });
};

//TODO: refactor to take advatage of ability to request multiple games/news stories at once?

const getGameNews = (id) => {
  const news = mongo.collection("News");
  return news.findOne({ _id: id }).then((record) => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let newsArticlesForGame;
    if (record === null || record.updatedAt < yesterday) {
      console.log("steam retreival for news from app " + id);
      newsArticlesForGame = retreiveGameNews(id);
    } else {
      newsArticlesForGame = record.news;
    }
    return newsArticlesForGame;
  });
};

const retreiveGameNews = (id) => {
  const news = mongo.collection("News");
  return axios
    .get(" https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002", {
      params: {
        appid: id,
        count: 10,
        maxlength: 500,
        feeds: "steam_community_announcements",
      },
    })
    .then((res) => res.data.appnews.newsitems)
    .then((newsRes) => {
      news.updateOne(
        { _id: id },
        {
          $setOnInsert: {
            _id: id,
          },
          $set: {
            news: newsRes,
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      );
      return newsRes;
    })
    .catch((error) => {
      fs.writeFileSync("output.txt", error.message);
      return null;
    });
};

const requestInfoNews = (key, appid, players, avatars) => {
  const gameNews = getGameNews(appid, 0);
  const gameInfo = getGamesInfo(key, [appid]);

  if (gameNews === null || gameInfo === null) {
    console.log("failed to retreive " + appid);
    return null;
  }

  return Promise.all([gameInfo, gameNews]).then((res) => {
    return mapNewsResults(res[0], res[1], players, avatars, appid);
  });
};

const mapNewsResults = (gameInfo, gameNews, players, avatars, appid) => {
  try {
    const { achievements, ...gameData } = gameInfo[0];
    const reducedNews = {};
    reducedNews.game = { ...gameData };
    reducedNews.news = [];
    for (const newsArticle of gameNews) {
      reducedNews.news.push({
        title: newsArticle.title,
        author: newsArticle.author,
        contents: newsArticle.contents,
        date: newsArticle.date,
      });
    }
    reducedNews.players = [];
    for (const steamid of players) {
      reducedNews.players.push(avatars[steamid]);
    }
    fs.appendFileSync("reducedNews.txt", JSON.stringify(reducedNews, null, 2));
    return reducedNews;
  } catch (error) {
    console.log(error);
    return {};
  }
};

//get all games that the friend is playing, then update the map containing gameid -> freinds playing ids
//returns promise for that friend's recently played
const updatePlayingMap = (key, friend, friendGames) => {
  const rp = mongo.collection("RecentlyPlayed");
  //request all recently played games by the friend
  return rp.findOne({ _id: friend }).then((record) => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (record === null || record.updatedAt < yesterday) {
      console.log("Steam retreival for recently played of " + friend);
      return axios
        .get(
          "http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/",
          {
            params: {
              key: key,
              steamid: friend,
              count: 10,
            },
          },
        )
        .then((response) => response.data.response)
        .then((response) => {
          if (response.games === undefined) {
            rp.updateOne(
              { _id: friend },
              {
                $setOnInsert: {
                  _id: friend,
                },
                $set: {
                  games: [],
                  updatedAt: new Date(),
                },
              },
              { upsert: true },
            );
            return;
          }
          for (const game of response.games) {
            //update map going from gameid -> array of friend ids who have played that game recently
            if (game.appid in friendGames)
              friendGames[game.appid].push(friend.steamid);
            else friendGames[game.appid] = [friend.steamid];
          }

          rp.updateOne(
            { _id: friend },
            {
              $setOnInsert: {
                _id: friend,
              },
              $set: {
                games: response.games,
                updatedAt: new Date(),
              },
            },
            { upsert: true },
          );
        })
        .catch((error) => fs.writeFileSync("output.txt", error.message));
    } else {
      for (const game of record.games) {
        //update map going from gameid -> array of friend ids who have played that game recently
        if (game.appid in friendGames)
          friendGames[game.appid].push(friend.steamid);
        else friendGames[game.appid] = [friend.steamid];
      }
    }
  });
};

module.exports = { getNews, requestInfoNews };
