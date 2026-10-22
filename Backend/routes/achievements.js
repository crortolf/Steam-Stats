const express = require("express");
const router = express.Router();
const fs = require("fs");

const {
  getAchievements,
  getGames,
} = require("../controllers/achievementsController");

router.get("/getAchievements", (req, response) => {
  // getAchievements(req.query.apiKey, req.query.appId, req.query.steamId).then(
  //   (result) => {
  //     fs.writeFileSync(
  //       "apiAchievementsDataReturn.txt",
  //       JSON.stringify(result, null, 2),
  //     );
  //     response.json(result);
  //   },
  // );
  response.json(JSON.parse(fs.readFileSync("apiAchievementsDataReturn.txt")));
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

module.exports = router;
