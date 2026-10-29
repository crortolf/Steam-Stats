const express = require("express");
const router = express.Router();
const fs = require("fs");
const { getGamesInfo, getOwnedGames } = require("../services/games");
const { getPlayersInfo } = require("../services/players");
const { getAchievements } = require("../controllers/achievementsController");

router.get("/getAchievements", (req, response) => {
  getAchievements(req.query.apiKey, req.query.appId, req.query.steamId).then(
    (result) => response.json(result),
  );
});

router.get("/getIdsTitles", (req, response) => {
  getOwnedGames(req.query.key, req.query.id).then((result) => {
    const idsTitles = result.map(({ id, title }) => {
      return [id, title];
    });
    response.json(idsTitles);
  });
});

router.get("/getGameAchievementsInfo", (req, response) => {
  getGamesInfo(req.query.key, [req.query.id]).then((result) =>
    response.json(result[0]),
  );
});

module.exports = router;
