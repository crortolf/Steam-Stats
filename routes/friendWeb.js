const express = require("express");
const router = express.Router();
const {
  getFriends,
  findConnection,
} = require("../controllers/friendWebController");

router.get("/getConnection", (req, response) => {
  findConnection(req.query.idOne, req.query.idTwo).then((result) =>
    response.json(result),
  );
});

router.get("/getFriends", (req, response) => {
  getFriends(req.query.steamid).then((result) => response.json(result));
});

module.exports = router;
