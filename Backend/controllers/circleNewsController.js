const axios = require("axios");
const fs = require("fs");

const myApiKey = "52852E7C5F7125BC5207C73C9BFC5423";

const getNews = (steamId) => {
  //map going from gameid -> friend ids of those that played recently
  const friendGames = {};
  const avatars = {};

  //request friends list for the given id
  return axios
    .get("https://api.steampowered.com/ISteamUser/GetFriendList/v0001/", {
      params: {
        key: myApiKey,
        steamid: steamId,
        relationship: "friend",
      },
    })
    .then((res) => {
      const populations = [];
      //iterate through friends and  populate the playing map
      for (friend of res.data.friendslist.friends) {
        //push promises for a friend's recently played data
        populations.push(updatePlayingMap(friend, friendGames));
      }
      //push promise for all avatars and names of friends
      populations.push(getAvatars(res.data.friendslist.friends, avatars));
      return Promise.all(populations)
        .then(() => {
          const newsPromises = [];
          //create, populate, display all news items
          for (const appid in friendGames) {
            //push promises for game news
            newsPromises.push(
              requestInfoNews(appid, friendGames[appid], avatars),
            );
          }

          return Promise.all(newsPromises);
        })
        .then((gameNewsItems) => {
          fs.writeFileSync(
            "formattedData.txt",
            JSON.stringify(gameNewsItems, null, 2),
          );
          return gameNewsItems;
        });
    })
    .catch((error) => console.log(error));
};

//makes a request for all data relating to the friends of the user so we can get their avatars
//avatars gives all friends' names and profile pics
const getAvatars = (friendsList, avatars) => {
  const ids = friendsList.map((friendResult) => friendResult.steamid);
  return axios
    .get("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/", {
      params: {
        key: myApiKey,
        steamids: ids.join(","),
      },
    })
    .then((res) => {
      for (const user of res.data.response.players) {
        avatars[user.steamid] = {
          avatar: user.avatarmedium,
          name: user.personaname,
        };
      }
    })
    .catch((error) => {
      fs.writeFileSync("circleNewsError.txt", error);
      console.log("see error in circleNewsError.txt");
    });
};

//TODO: refactor to take advatage of ability to request multiple games/news stories at once?

const requestInfo = (appid, retries) => {
  if (retries >= 3) return null;

  return axios
    .get("https://store.steampowered.com/api/appdetails/", {
      params: {
        appids: appid,
      },
    })
    .then((res) => res.data)
    .catch((error) => {
      fs.appendFileSync("output.txt", JSON.stringify(error.toJSON(), null, 2));
      return requestInfo(appid, retries + 1);
    });
};

const requestNews = (appid, retries) => {
  if (retries >= 3) return null;

  return axios
    .get(" https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002", {
      params: {
        appid: appid,
        count: 10,
        maxlength: 500,
      },
    })
    .then((res) => res.data)
    .catch((error) => {
      fs.appendFileSync("output.txt", JSON.stringify(error.toJSON(), null, 2));
      return requestNews(appid, retries + 1);
    });
};

const requestInfoNews = (appid, players, avatars) => {
  const gameNews = requestNews(appid, 0);
  const gameInfo = requestInfo(appid, 0);

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
    const reducedNews = {};
    reducedNews.game = {};
    fs.appendFileSync("gameNews.txt", JSON.stringify(gameNews, null, 2));
    fs.appendFileSync("gameInfo.txt", JSON.stringify(gameInfo, null, 2));
    //reducedNews.game.appid = gameInfo;
    reducedNews.game.appid = appid;
    reducedNews.game.appImage = gameInfo[appid].data.header_image;
    reducedNews.game.title = gameInfo[appid].data.name;
    reducedNews.news = [];
    for (const newsArticle of gameNews.appnews.newsitems) {
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
const updatePlayingMap = (friend, friendGames) => {
  //request all recently played games by the friend
  return axios
    .get(
      "http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/",
      {
        params: {
          key: myApiKey,
          steamid: friend.steamid,
          count: 10,
        },
      },
    )
    .then((res) => {
      if (
        res.data.response &&
        res.data.response.games &&
        res.data.response.games.length > 0
      ) {
        const games = res.data.response.games;
        for (const game of games) {
          //update map going from gameid -> array of friend ids who have played that game recently
          if (game.appid in friendGames)
            friendGames[game.appid].push(friend.steamid);
          else friendGames[game.appid] = [friend.steamid];
        }
      }
    })
    .catch((error) => fs.writeFileSync("output.txt", error));
};

module.exports = { getNews };
