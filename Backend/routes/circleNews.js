const express = require("express");
const router = express.Router();
const fs = require("fs");

const { getNews } = require("../controllers/circleNewsController");

router.get("/getNews", (req, response) => {
  // getNews(req.query.id).then((result) => {
  //   fs.writeFileSync("apiDataReturn.txt", JSON.stringify(result, null, 2));
  //   response.json(result);
  // });
  response.json(JSON.parse(fs.readFileSync("apiDataReturn.txt")));
});

module.exports = router;
