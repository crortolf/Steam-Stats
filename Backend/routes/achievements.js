const express = require("express");
const router = express.Router();
const fs = require("fs");
const { getGameInfo } = require("../services/getGames");
const { getAchievements } = require("../controllers/achievementsController");

router.get("/getAchievements", (req, response) => {
  getAchievements(req.query.apiKey, req.query.appId, req.query.steamId).then(
    (result) => response.json(result),
  );
});

router.get("/getGames", (req, response) => {
  // getGames(req.query.apiKey, req.query.steamId).then((result) => {
  //   fs.writeFileSync(
  //     "apiOwnedGamesDataReturn.txt",
  //     JSON.stringify(result, null, 2),
  //   );
  //   response.json(result);
  // });
  response.json(JSON.parse(fs.readFileSync("apiOwnedGamesDataReturn.txt")));
});

router.get("/temp", (req, response) => {
  getGameInfo(req.query.apiKey, req.query.ids.split(",")).then((result) =>
    response.json(result),
  );
});

module.exports = router;
