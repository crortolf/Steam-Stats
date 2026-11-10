const axios = require("axios");
const fs = require("fs");
const { getGamesInfo } = require("../services/games");
const { getPlayersInfo } = require("../services/players");
const { getIds } = require("../services/friends");
const { isStale, cacheFailure, scopedId } = require("../services/cache");
const mc = require("mongodb");

const mongo = new mc.MongoClient("mongodb://localhost:27017", {
  serverApi: {
    version: mc.ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}).db("Steam-Stats");

const MAX_NEWS_ARTICLES = 50;

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
        const gamePromises = [];
        //articles aren't included here, the frontend asks for them with getNewsPage once a game is selected
        for (const appid in friendGames) {
          console.log("pushing promise for " + appid);
          gamePromises.push(
            requestGameInfo(apiKey, appid, friendGames[appid], avatars),
          );
        }

        //games that couldn't be retreived come back as null
        return Promise.all(gamePromises).then((results) =>
          results.filter((result) => result !== null),
        );
      });
    });
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
      for (const user of res.filter(
        (friend) => friend !== null && friend.image !== null,
      )) {
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

//returns one page of a game's articles, in the NewsPage format from the frontend's lib/types.ts
const getNewsPage = (appid, offset, count) => {
  return getGameNews(appid).then((articles) => {
    if (articles === null) {
      throw new Error("failed to retreive news for app " + appid);
    }
    return {
      news: articles
        .slice(offset, offset + count)
        .map(({ gid, url, title, author, contents, date }) => ({
          gid,
          url,
          title,
          author,
          contents,
          //steam gives seconds, the frontend passes this directly to new Date()
          date: date * 1000,
        })),
      hasMore: offset + count < articles.length,
    };
  });
};

const getGameNews = (id) => {
  const news = mongo.collection("News");
  return news.findOne({ _id: id }).then((record) => {
    //records with a different cachedCount were saved with fewer or shortened articles
    if (
      isStale(record) ||
      (!record.failedAt && record.cachedCount !== MAX_NEWS_ARTICLES)
    ) {
      console.log("steam retreival for news from app " + id);
      return retreiveGameNews(id).then(
        (articles) => articles ?? record?.news ?? null,
      );
    }
    //a record holding only a cached failure has no news
    return record.news ?? null;
  });
};

const retreiveGameNews = (id) => {
  const news = mongo.collection("News");
  return axios
    .get(" https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002", {
      params: {
        appid: id,
        //the whole limit is stored at once so paging doesn't need more steam requests
        count: MAX_NEWS_ARTICLES,
        //0 returns the whole article
        maxlength: 0,
        feeds: "steam_community_announcements",
      },
    })
    .then((res) => res.data.appnews.newsitems)
    .then((newsRes) => {
      news
        .updateOne(
          { _id: id },
          {
            $setOnInsert: {
              _id: id,
            },
            $set: {
              news: newsRes,
              cachedCount: MAX_NEWS_ARTICLES,
              updatedAt: new Date(),
            },
            $unset: { fullContents: "", failedAt: "" },
          },
          { upsert: true },
        )
        .catch((error) => console.log(error.message));
      return newsRes;
    })
    .catch((error) => {
      fs.writeFileSync("output.txt", error.message);
      cacheFailure(news, { _id: id });
      return null;
    });
};

const requestGameInfo = (key, appid, players, avatars) => {
  return getGamesInfo(key, [appid]).then((gameInfo) => {
    return mapGameResults(gameInfo, players, avatars, appid);
  });
};

//builds the FriendGame object described in the frontend's lib/types.ts
const mapGameResults = (gameInfo, players, avatars, appid) => {
  const game = gameInfo[0];
  if (!game) {
    console.log("failed to retreive " + appid);
    return null;
  }

  return {
    game: { id: game.id, name: game.name, image: game.image },
    //friends without a retreivable profile have no avatars entry
    players: players
      .map((steamid) => avatars[steamid])
      .filter((player) => player !== undefined),
  };
};

//get all games that the friend is playing, then update the map containing gameid -> freinds playing ids
//returns promise for that friend's recently played
//recently played is cached per api key (see keyScope in cache.js), so a
//friends-only list read with one user's key isn't shown to another user
const updatePlayingMap = (key, friend, friendGames) => {
  const rp = mongo.collection("RecentlyPlayed");
  const _id = scopedId(key, friend);
  //request all recently played games by the friend
  return rp.findOne({ _id }).then((record) => {
    if (isStale(record)) {
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
          //hidden or empty: steam sends no games
          const games = response?.games ?? [];
          for (const game of games) {
            //update map going from gameid -> array of friend ids who have played that game recently
            if (game.appid in friendGames)
              friendGames[game.appid].push(friend);
            else friendGames[game.appid] = [friend];
          }

          rp.updateOne(
            { _id },
            {
              $setOnInsert: {
                _id,
                steamId: friend,
              },
              $set: {
                games: games,
                updatedAt: new Date(),
              },
              $unset: { failedAt: "" },
            },
            { upsert: true },
          ).catch((error) => console.log(error.message));
        })
        .catch((error) => {
          fs.writeFileSync("output.txt", error.message);
          cacheFailure(rp, { _id });
          //fall back on whatever we have stored
          for (const game of record?.games ?? []) {
            if (game.appid in friendGames) friendGames[game.appid].push(friend);
            else friendGames[game.appid] = [friend];
          }
        });
    } else {
      //a record holding only a cached failure has no games
      for (const game of record.games ?? []) {
        //update map going from gameid -> array of friend ids who have played that game recently
        if (game.appid in friendGames) friendGames[game.appid].push(friend);
        else friendGames[game.appid] = [friend];
      }
    }
  });
};

module.exports = { getNews, getNewsPage, MAX_NEWS_ARTICLES };
