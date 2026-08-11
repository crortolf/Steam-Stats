const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

const con = require("./connectionsAPI");
const news = require("./newsAPI");

app.get("/GetConnection", (req, res) => {
  try {
    con
      .findConnection(req.query.idOne, req.query.idTwo)
      .then((foundRelationship) => res.json(foundRelationship));
  } catch (error) {
    console.log(error);
    res.status(400).json("error in searching for relationship");
  }
});

app.get("/GetNews", (req, res) => {
  try {
    news.getNews(req.query.steamid).then((articles) => {
      console.log("articles are: ");
      console.dir(articles, { depth: null });
      res.json(articles);
    });
  } catch (error) {
    //console.log(error);
    res.status(400).json("error in searching for relationship");
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(3001, () => {
  console.log(`Server running on port 3001`);
});
