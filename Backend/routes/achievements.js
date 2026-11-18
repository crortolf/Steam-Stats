const express = require("express");
const router = express.Router();
const fs = require("fs");
const { getGamesInfo, getOwnedGames } = require("../services/games");
const { getPlayersInfo } = require("../services/players");
const { getAchievements } = require("../controllers/achievementsController");
const { requireSteamApiKey } = require("../controllers/authController");

//every route here calls steam, so each needs a signed in user with an api key
router.use(requireSteamApiKey);

/**
 * GET /achievements/getAchievements. Everything the achievements page shows for one game.
 *
 * @param {import("express").Request} req - req.query: { appId, steamId }.
 * @param {import("express").Response} response - 200 with getAchievements'
 *   result; 500 { error } if it failed.
 */
router.get("/getAchievements", (req, response) => {
  getAchievements(req.steamApiKey, req.query.appId, req.query.steamId)
    .then((result) => response.json(result))
    .catch((error) => {
      console.log(error.message);
      response.status(500).json({ error: "Failed to load achievements" });
    });
});

/**
 * GET /achievements/getIdsTitles. A player's library as [app id, name] pairs,
 * for picking a game.
 *
 * Reads the library with getOwnedGames (cache first) and keeps only each
 * game's id and name.
 *
 * @param {import("express").Request} req - req.query.id: the player's steam id.
 * @param {import("express").Response} response - 200 with [[id, title], ...].
 *   Sends nothing if loading the library fails.
 */
router.get("/getIdsTitles", (req, response) => {
  getOwnedGames(req.steamApiKey, req.query.id).then((result) => {
    const idsTitles = result.map(({ id, title }) => {
      return [id, title];
    });
    response.json(idsTitles);
  });
});

/**
 * GET /achievements/getGameAchievementsInfo. One game's details and achievement list.
 *
 * @param {import("express").Request} req - req.query.id: the game's app id.
 * @param {import("express").Response} response - 200 with getGamesInfo's entry
 *   for the game (null if steam has no record of it).
 */
router.get("/getGameAchievementsInfo", (req, response) => {
  getGamesInfo(req.steamApiKey, [req.query.id]).then((result) =>
    response.json(result[0]),
  );
});

module.exports = router;
