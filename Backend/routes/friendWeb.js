const express = require("express");
const router = express.Router();
const {
  getFriends,
  findConnection,
  getPlayerCard,
} = require("../controllers/friendWebController");
const { getIds } = require("../services/friends");
const { requireSteamApiKey } = require("../controllers/authController");

//every route here calls steam, so each needs a signed in user with an api key
router.use(requireSteamApiKey);

/**
 * GET /friendWeb/getConnection. A chain of friends linking two players.
 *
 * @param {import("express").Request} req - req.query: { idOne, idTwo }.
 * @param {import("express").Response} response - 200 with findConnection's
 *   result; 500 { error } if it failed (including missing or equal ids).
 */
router.get("/getConnection", (req, response) => {
  findConnection(req.steamApiKey, req.query.idOne, req.query.idTwo)
    .then((result) => response.json(result))
    .catch((error) => {
      console.log(error.message);
      response.status(500).json({ error: "Failed to find a connection" });
    });
});

/**
 * GET /friendWeb/getFriends. The friend network graph for a player.
 *
 * @param {import("express").Request} req - req.query.steamid: the player.
 * @param {import("express").Response} response - 200 { user, friends } from
 *   getFriends; 500 { error } if it failed.
 */
router.get("/getFriends", (req, response) => {
  getFriends(req.steamApiKey, req.query.steamid)
    .then((result) => response.json(result))
    .catch((error) => {
      console.log(error.message);
      response.status(500).json({ error: "Failed to load friends" });
    });
});

/**
 * GET /friendWeb/getPlayerCard. The details for one player's card.
 *
 * @param {import("express").Request} req - req.query: { steamid, friendOf? }.
 * @param {import("express").Response} response - 200 with getPlayerCard's
 *   result; 404 { error } if steam has no such player; 500 { error } if it failed.
 */
router.get("/getPlayerCard", (req, response) => {
  getPlayerCard(req.steamApiKey, req.query.steamid, req.query.friendOf)
    .then((result) =>
      result
        ? response.json(result)
        : response.status(404).json({ error: "Player not found" }),
    )
    .catch((error) => {
      console.log(error.message);
      response.status(500).json({ error: "Failed to load player" });
    });
});

/**
 * GET /friendWeb/getIds. A player's friends' steam ids.
 *
 * @param {import("express").Request} req - req.query.id: the player.
 * @param {import("express").Response} response - 200 with [steamid, ...].
 *   Sends nothing if loading fails.
 */
router.get("/getIds", (req, response) => {
  getIds(req.steamApiKey, req.query.id).then((result) => response.json(result));
});

module.exports = router;
