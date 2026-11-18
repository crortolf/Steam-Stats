const axios = require("axios");
const fs = require("fs");
const { getGamesInfo } = require("../services/games");
const { getPlayersInfo } = require("../services/players");
const { getIds } = require("../services/friends");
const { isStale, cacheFailure, scopedId } = require("../services/cache");
const { getFlaggedIds } = require("../services/flaggedUsers");
const mc = require("mongodb");

const mongo = new mc.MongoClient("mongodb://localhost:27017", {
  serverApi: {
    version: mc.ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}).db("Steam-Stats");

const MAX_NEWS_ARTICLES = 50;

/**
 * Lists the games a player's friends have played recently, with which friends
 * played each. Used by the Games & News page; articles are loaded separately
 * with getNewsPage.
 *
 * Gets the friend list, then in parallel: each friend's recently played games
 * (updatePlayingMap fills a map from app id to friend ids), every friend's
 * name and avatar (getAvatars), and which friends have flagged usernames.
 * Then builds one entry per game with requestGameInfo, dropping games whose
 * details couldn't be loaded.
 *
 * @param {string} apiKey - The signed in user's steam api key.
 * @param {string} steamId - The player's 64-bit steam id.
 * @returns {Promise<object[]>} One FriendGame per game (see mapGameResults):
 *   { game: { id, name, image }, players, otherPlayers }.
 */
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
      //friends with flagged usernames are only counted, never named
      const flagged = getFlaggedIds(friendsList);
      return Promise.all([flagged, ...populations]).then(([flaggedIds]) => {
        console.log("got here");
        console.log(JSON.stringify());
        const gamePromises = [];
        //articles aren't included here, the frontend asks for them with getNewsPage once a game is selected
        for (const appid in friendGames) {
          console.log("pushing promise for " + appid);
          gamePromises.push(
            requestGameInfo(
              apiKey,
              appid,
              friendGames[appid],
              avatars,
              flaggedIds,
            ),
          );
        }

        //games that couldn't be retreived come back as null
        return Promise.all(gamePromises).then((results) =>
          results.filter((result) => result !== null),
        );
      });
    });
};

/**
 * Collects every friend's name and avatar into the avatars map.
 *
 * Loads the friends with getPlayersInfo (cache first) and adds each one that
 * has a profile picture. The results and any error are also written to text
 * files for debugging.
 *
 * @param {string} key - The signed in user's steam api key.
 * @param {string[]} friendsList - The friends' steam ids.
 * @param {Object<string, {avatar: string, name: string}>} avatars - Filled in
 *   place, keyed by steam id.
 * @returns {Promise<void>} Resolves once avatars is filled. Never rejects;
 *   errors are written to circleNewsError.txt.
 */
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

/**
 * Gets one page of a game's news articles, in the NewsPage format from the
 * frontend's lib/types.ts.
 *
 * Loads all of the game's cached articles with getGameNews, slices out the
 * page, keeps the fields the frontend uses, and turns steam's dates (seconds)
 * into milliseconds.
 *
 * @param {string|number} appid - The game's steam app id.
 * @param {number} offset - How many articles to skip.
 * @param {number} count - How many articles to return.
 * @returns {Promise<{news: object[], hasMore: boolean}>} The articles as
 *   { gid, url, title, author, contents, date }, and whether more come after.
 *   Rejects if the game's news isn't available.
 */
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

/**
 * Gets a game's news articles, from the cache when it's fresh and from steam otherwise.
 *
 * Looks up the News record for the game. It's fetched again if it's stale (see
 * isStale) or was saved under an older article limit; if steam then fails, the
 * stored articles are used. News is the same for everyone, so it isn't cached per key.
 *
 * @param {string|number} id - The game's steam app id.
 * @returns {Promise<object[]|null>} Steam's news items (up to 50, newest
 *   first), or null if there's no news available.
 */
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

/**
 * Asks steam for a game's news and caches it.
 *
 * Calls steam's GetNewsForApp for the game's official announcements, asking
 * for the full limit with whole articles so paging never needs another steam
 * request, and saves them in the background. If steam fails, writes the error
 * to output.txt and records the failure.
 *
 * @param {string|number} id - The game's steam app id.
 * @returns {Promise<object[]|null>} Steam's news items, or null if the request
 *   failed. Never rejects.
 */
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

/**
 * Loads a game's details and builds its entry for the Games & News page.
 *
 * Gets the game with getGamesInfo (cache first) and passes it to mapGameResults.
 *
 * @param {string} key - The signed in user's steam api key.
 * @param {string} appid - The game's steam app id.
 * @param {string[]} players - Steam ids of the friends who played it recently.
 * @param {Object<string, {avatar: string, name: string}>} avatars - Friends'
 *   names and avatars, keyed by steam id.
 * @param {Set<string>} flaggedIds - Friends with flagged usernames.
 * @returns {Promise<object|null>} See mapGameResults.
 */
const requestGameInfo = (key, appid, players, avatars, flaggedIds) => {
  return getGamesInfo(key, [appid]).then((gameInfo) => {
    return mapGameResults(gameInfo, players, avatars, appid, flaggedIds);
  });
};

/**
 * Builds the FriendGame object described in the frontend's lib/types.ts.
 *
 * Players with flagged usernames (see FlaggedUsers) are left out of players
 * and only counted in otherPlayers, so their name and avatar never reach the
 * page. Friends without a loadable profile are left out entirely.
 *
 * @param {(object|null)[]} gameInfo - getGamesInfo's result for this one game.
 * @param {string[]} players - Steam ids of the friends who played it recently.
 * @param {Object<string, {avatar: string, name: string}>} avatars - Friends'
 *   names and avatars, keyed by steam id.
 * @param {string} appid - The game's app id, for the log message if it's missing.
 * @param {Set<string>} [flaggedIds] - Friends with flagged usernames.
 * @returns {{game: {id: number, name: string, image: string}, players:
 *   {avatar: string, name: string}[], otherPlayers: number}|null} The entry,
 *   or null if the game's details couldn't be loaded.
 */
const mapGameResults = (
  gameInfo,
  players,
  avatars,
  appid,
  flaggedIds = new Set(),
) => {
  const game = gameInfo[0];
  if (!game) {
    console.log("failed to retreive " + appid);
    return null;
  }

  return {
    game: { id: game.id, name: game.name, image: game.image },
    //friends without a retreivable profile have no avatars entry
    players: players
      .filter((steamid) => !flaggedIds.has(steamid))
      .map((steamid) => avatars[steamid])
      .filter((player) => player !== undefined),
    otherPlayers: players.filter((steamid) => flaggedIds.has(steamid)).length,
  };
};

/**
 * Adds a friend to the map of who played what recently.
 *
 * Gets the friend's recently played games (up to 10), from the RecentlyPlayed
 * cache when it's fresh and from steam's GetRecentlyPlayedGames otherwise,
 * saving the result. Then appends the friend's id to friendGames under each of
 * those games. If steam fails, records the failure and uses the stored list.
 *
 * Recently played is cached per api key (see keyScope in cache.js), so a
 * friends-only list read with one user's key isn't shown to another user.
 *
 * @param {string} key - The signed in user's steam api key.
 * @param {string} friend - The friend's 64-bit steam id.
 * @param {Object<string, string[]>} friendGames - Map from app id to the ids
 *   of friends who played it recently. Changed in place.
 * @returns {Promise<void>} Resolves once friendGames includes this friend.
 */
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
