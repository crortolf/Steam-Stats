const axios = require("axios");
const myApiKey = "52852E7C5F7125BC5207C73C9BFC5423";

const getNews = (steamId) => {
  const friendGames = {};
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
      return Promise.all(populations)
        .then(() => {
          const newsPromises = [];
          //create, populate, display all news items
          for (const appid in friendGames) {
            newsPromises.push(requestInfoNews(appid));
          }

          return Promise.all(newsPromises);
        })
        .catch((error) => console.log(error));
    });
};

const requestInfoNews = (appid) => {
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
    return mapNewsResults(res[0], res[1]);
  });
};

const mapNewsResults = (gameInfo, gameNews) => {
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
          count: 3,
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
          if (game.appid in friendGames) friendGames[game.appid]++;
          else friendGames[game.appid] = 1;
        }
      }
    });
};

module.exports = { getNews };
