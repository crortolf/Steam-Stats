const express = require("express");
const router = express.Router();
const fs = require("fs");

const getNews = require("../controllers/circleNewsController");

router.get("/getNews", (req, response) => {
  getNews(req.query.id).then((result) => {
    response.json(result);
  });
});

module.exports = router;
