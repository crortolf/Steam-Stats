//the backend's entry point: an express server on port 5011 that the frontend
//calls. each url prefix is handled by one router in routes/, which passes the
//work to controllers/ (request handling) and services/ (database and steam)
const express = require("express");
const cors = require("cors");
const app = express();
const fs = require("fs");
const friendWeb = require("./routes/friendWeb");
const circleNews = require("./routes/circleNews");
const achievements = require("./routes/achievements");
const auth = require("./routes/auth");
const recommendations = require("./routes/recommendations");
const { doesFriendOwn } = require("./controllers/achievementsController");
const { getNews } = require("./controllers/circleNewsController");
const { FRONTEND_ORIGIN } = require("./config");

//credentials lets the browser send the session cookie, which needs a specific origin
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));

app.use("/auth", auth);
app.use("/friendWeb", friendWeb);
app.use("/circleNews", circleNews);
app.use("/achievements", achievements);
app.use("/recommendations", recommendations);

app.listen(5011, () => console.log("listening on 5011"));
