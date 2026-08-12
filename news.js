const myApiKey = "52852E7C5F7125BC5207C73C9BFC5423";
const container = document.getElementById("news-container");
const gameNewsTemplate = document.getElementById("game-news-template");

const getNews = () => {
  const userId = document.getElementById("user-steam-id").value.trim();
  const friendGames = {};

  axios
    .get("http://localhost:3001/GetNews", {
      params: {
        steamid: userId,
      },
    })
    .then((res) => displayNews(res.data));
};

const displayNews = (newsByGame) => {
  console.log(newsByGame);
  for (const game of newsByGame) {
    const newsContainerInstance = document
      .getElementById("game-news-template")
      .content.cloneNode(true);
    newsContainerInstance.querySelector(".game-image").src = game.appImage;
    newsContainerInstance.querySelector(".game-image").alt = newsByGame.title;
    for (const article of game.news) {
      const articleInstance = document
        .getElementById("news-card")
        .content.cloneNode(true);

      console.log(article);
      const date = new Date(article.date * 1000);
      articleInstance.querySelector(".news-title").innerText = article.title;
      articleInstance.querySelector(".news-date").innerText =
        date.toDateString();
      articleInstance.querySelector(".news-content").innerText =
        article.contents;

      newsContainerInstance.querySelector(".flex").appendChild(articleInstance);
    }
    container.appendChild(newsContainerInstance);
  }

  console.log(newsByGame);
};

// const getNews = (appid, newsContainerInstance) => {
//   return axios
//     .get("http://localhost:3001/api/steam/ISteamNews/GetNewsForApp/v0002/", {
//       params: {
//         appid: appid,
//         count: 10,
//         maxlength: 100,
//         include_appinfo: true,
//       },
//     })
//     .then((res) => {
//       for (let i = 0; i < 3; i++) {
//         const testInstance = document
//           .getElementById("news-card")
//           .content.cloneNode(true);
//         newsContainerInstance.appendChild(testInstance);
//       }
//     });
// };

// const updatePlayingMap = (friend, friendGames) => {
//   return axios
//     .get(
//       "http://localhost:3001/api/steam/IPlayerService/GetRecentlyPlayedGames/v0001/",
//       {
//         params: {
//           key: myApiKey,
//           steamid: friend.steamid,
//           count: 3,
//         },
//       },
//     )
//     .then((res) => {
//       if (
//         res.data.response &&
//         res.data.response.games &&
//         res.data.response.games.length > 0
//       ) {
//         const games = res.data.response.games;
//         for (const game of games) {
//           console.log(game);
//           if (game.appid in friendGames) friendGames[game.appid]++;
//           else friendGames[game.appid] = 1;
//         }
//       }
//     });
// };
