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
