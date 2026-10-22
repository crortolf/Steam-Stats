const express = require("express");
const router = express.Router();
const fs = require("fs");

const { getAchievements } = require("../controllers/achievementsController");

router.get("/getAchievements", (req, response) => {
  getAchievements(req.query.id).then((result) => {
    fs.writeFileSync(
      "apiAchievementsDataReturn.txt",
      JSON.stringify(result, null, 2),
    );
    response.json(result);
  });
  //response.json(JSON.parse(fs.readFileSync("apiAchievementsDataReturn.txt")));
});

module.exports = router;
