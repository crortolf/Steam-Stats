const myApiKey = "52852E7C5F7125BC5207C73C9BFC5423";
const container = document.getElementById("news-container");
const gameNewsTemplate = document.getElementById("game-news-template");

const displayNews = () => {
  const userId = document.getElementById("user-steam-id").value.trim();
  const friendGames = {};

  axios
    .get("http://localhost:3001/api/steam/ISteamUser/GetFriendList/v0001/", {
      params: {
        key: myApiKey,
        steamid: userId,
        relationship: "friend",
      },
    })
    .then((res) => {
      const populations = [];
      for (friend of res.data.friendslist.friends) {
        populations.push(updatePlayingMap(friend, friendGames));
      }
      Promise.all(populations).then(() => {
        //create, populate, display all news items
        for (const appid in friendGames) {
          const gameNewsInstance = gameNewsTemplate.content.cloneNode(true);
          getNews(appid, gameNewsInstance.querySelector(".flex"));
          container.appendChild(gameNewsInstance);
        }
      });
    });
};

const getNews = (appid, newsContainerInstance) => {
  return axios
    .get("http://localhost:3001/api/steam/ISteamNews/GetNewsForApp/v0002/", {
      params: {
        appid: appid,
        count: 10,
        maxlength: 100,
        include_appinfo: true,
      },
    })
    .then((res) => {
      for (let i = 0; i < 3; i++) {
        const testInstance = document
          .getElementById("news-card")
          .content.cloneNode(true);
        newsContainerInstance.appendChild(testInstance);
      }
    });
};

const updatePlayingMap = (friend, friendGames) => {
  return axios
    .get(
      "http://localhost:3001/api/steam/IPlayerService/GetRecentlyPlayedGames/v0001/",
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
          console.log(game);
          if (game.appid in friendGames) friendGames[game.appid]++;
          else friendGames[game.appid] = 1;
        }
      }
    });
};
