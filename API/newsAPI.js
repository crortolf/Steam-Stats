const axios = require("axios");
const myApiKey = "52852E7C5F7125BC5207C73C9BFC5423";

const getNews = (steamId) => {
  const friendGames = {};
  const avatars = {};
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
      for (friend of res.data.friendslist.friends) {
        populations.push(updatePlayingMap(friend, friendGames));
      }
      populations.push(getAvatars(res.data.friendslist.friends, avatars));
      return Promise.all(populations)
        .then(() => {
          const newsPromises = [];
          //create, populate, display all news items
          for (const appid in friendGames) {
            newsPromises.push(
              requestInfoNews(appid, friendGames[appid], avatars),
            );
          }

          return Promise.all(newsPromises);
        })
        .catch((error) => console.log(error));
    });
};

const getAvatars = (friendsList, avatars) => {
  const avatarRetrievals = [];
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
    });
};

const requestInfoNews = (appid, players, avatars) => {
  const gameInfo = axios
    .get("https://store.steampowered.com/api/appdetails/", {
      params: {
        appids: appid,
      },
    })
    .then((res) => res.data);

  const gameNews = axios
    .get("http://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/", {
      params: {
        appid: appid,
        count: 10,
        maxlength: 10000,
        include_appinfo: true,
        feeds: "steam_community_announcements",
      },
    })
    .then((res) => res.data);

  return Promise.all([gameInfo, gameNews]).then((res) => {
    return mapNewsResults(res[0], res[1], players, avatars);
  });
};

const mapNewsResults = (gameInfo, gameNews, players, avatars) => {
  const reducedNews = {};
  reducedNews.appid = gameNews.appnews.appid;
  reducedNews.appImage = gameInfo[reducedNews.appid].data.header_image;
  reducedNews.title = gameInfo[reducedNews.appid].data.name;
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
  return reducedNews;
};

const updatePlayingMap = (friend, friendGames) => {
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
          if (game.appid in friendGames)
            friendGames[game.appid].push(friend.steamid);
          else friendGames[game.appid] = [friend.steamid];
        }
      }
    });
};

module.exports = { getNews };
