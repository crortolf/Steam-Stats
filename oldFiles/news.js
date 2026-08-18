const myApiKey = "52852E7C5F7125BC5207C73C9BFC5423";
const container = document.getElementById("news-container");
const gameNewsTemplate = document.getElementById("game-news-template");

const getNews = () => {
  const userId = document.getElementById("user-steam-id").value.trim();
  const friendGames = {};

  container.innerHTML = "";

  axios
    .get("http://localhost:3001/GetNews", {
      params: {
        steamid: userId,
      },
    })
    .then((res) => displayNews(res.data));
};

const displayNews = (newsByGame) => {
  newsByGame.sort(
    (gameOne, gameTwo) => gameTwo.players.length - gameOne.players.length,
  );
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

      const date = new Date(article.date * 1000);
      articleInstance.querySelector(".news-title").innerText = article.title;
      articleInstance.querySelector(".news-date").innerText =
        date.toDateString();
      articleInstance.querySelector(".news-content").innerText =
        article.contents;

      newsContainerInstance.querySelector(".flex").appendChild(articleInstance);
    }
    const playerContainer =
      newsContainerInstance.querySelector(".player-container");
    for (const player of game.players) {
      const playerInstance = document
        .getElementById("player-display")
        .content.cloneNode(true);
      playerInstance.querySelector(".player-avatar").src = player.avatar;
      playerInstance.querySelector(".player-avatar").alt =
        player.name + "'s Profile Avatar";
      playerInstance.querySelector(".player-name").innerText = player.name;
      playerContainer.append(playerInstance);
    }
    container.appendChild(newsContainerInstance);
  }
};
