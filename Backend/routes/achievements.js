const express = require("express");
const router = express.Router();
const fs = require("fs");
const { getGamesInfo, getOwnedGames } = require("../services/games");
const { getPlayersInfo } = require("../services/players");
const { getAchievements } = require("../controllers/achievementsController");
const { requireSteamApiKey } = require("../controllers/authController");

router.use(requireSteamApiKey);

router.get("/getAchievements", (req, response) => {
  getAchievements(req.steamApiKey, req.query.appId, req.query.steamId)
    .then((result) => response.json(result))
    .catch((error) => {
      console.log(error.message);
      response.status(500).json({ error: "Failed to load achievements" });
    });
});

router.get("/getIdsTitles", (req, response) => {
  getOwnedGames(req.steamApiKey, req.query.id).then((result) => {
    const idsTitles = result.map(({ id, title }) => {
      return [id, title];
    });
    response.json(idsTitles);
  });
});

router.get("/getGameAchievementsInfo", (req, response) => {
  getGamesInfo(req.steamApiKey, [req.query.id]).then((result) =>
    response.json(result[0]),
  );
});

module.exports = router;
