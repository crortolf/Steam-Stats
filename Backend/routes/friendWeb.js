const express = require("express");
const router = express.Router();
const {
  getFriends,
  findConnection,
} = require("../controllers/friendWebController");
const { getIds } = require("../services/friends");

router.get("/getConnection", (req, response) => {
  findConnection(req.query.idOne, req.query.idTwo).then((result) =>
    response.json(result),
  );
});

router.get("/getFriends", (req, response) => {
  getFriends(req.query.steamid).then((result) => response.json(result));
});

router.get("/getIds", (req, response) => {
  getIds(req.query.key, req.query.id).then((result) => response.json(result));
});

module.exports = router;
