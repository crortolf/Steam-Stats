const express = require("express");
const router = express.Router();
const fs = require("fs");

const {
  getNews,
  getNewsPage,
  MAX_NEWS_ARTICLES,
} = require("../controllers/circleNewsController");
const {
  requireUser,
  requireSteamApiKey,
} = require("../controllers/authController");

/**
 * GET /circleNews/getNews. The games a player's friends played recently, with
 * who played each.
 *
 * @param {import("express").Request} req - req.query.id: the player's steam
 *   id. Needs a signed in user with an api key.
 * @param {import("express").Response} response - 200 with getNews' result;
 *   500 { error } if it failed.
 */
router.get("/getNews", requireSteamApiKey, (req, response) => {
  getNews(req.steamApiKey, req.query.id)
    .then((result) => {
      response.json(result);
    })
    .catch((error) => {
      console.log(error.message);
      response.status(500).json({ error: "Failed to load news" });
    });
});

/**
 * GET /circleNews/getNewsPage. One page of a game's news articles.
 *
 * Checks the query (a numeric app id, offset of 0 or more, count from 1 to
 * 50), then loads the page with getNewsPage. News needs no api key, so only
 * sign in is required.
 *
 * @param {import("express").Request} req - req.query: { appid, offset? (default
 *   0), count? (default 5) }.
 * @param {import("express").Response} response - 200 { news, hasMore };
 *   400 { error } for an invalid query; 500 { error } if loading failed.
 */
router.get("/getNewsPage", requireUser, (req, response) => {
  const { appid } = req.query;
  const offset = Number(req.query.offset ?? 0);
  const count = Number(req.query.count ?? 5);

  if (
    !/^\d+$/.test(appid) ||
    !Number.isInteger(offset) ||
    !Number.isInteger(count) ||
    offset < 0 ||
    count < 1 ||
    count > MAX_NEWS_ARTICLES
  ) {
    return response.status(400).json({ error: "Invalid news request" });
  }

  getNewsPage(appid, offset, count)
    .then((result) => {
      response.json(result);
    })
    .catch((error) => {
      console.log(error.message);
      response.status(500).json({ error: "Failed to load news" });
    });
});

module.exports = router;
