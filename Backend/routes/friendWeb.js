const express = require("express");
const router = express.Router();
const {
  getFriends,
  findConnection,
  getPlayerCard,
} = require("../controllers/friendWebController");
const { getIds } = require("../services/friends");
const { requireSteamApiKey } = require("../controllers/authController");

router.use(requireSteamApiKey);

router.get("/getConnection", (req, response) => {
  findConnection(req.steamApiKey, req.query.idOne, req.query.idTwo)
    .then((result) => response.json(result))
    .catch((error) => {
      console.log(error.message);
      response.status(500).json({ error: "Failed to find a connection" });
    });
});

router.get("/getFriends", (req, response) => {
  getFriends(req.steamApiKey, req.query.steamid)
    .then((result) => response.json(result))
    .catch((error) => {
      console.log(error.message);
      response.status(500).json({ error: "Failed to load friends" });
    });
});

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

router.get("/getIds", (req, response) => {
  getIds(req.steamApiKey, req.query.id).then((result) => response.json(result));
});

module.exports = router;
