const express = require("express");
const cors = require("cors");
const app = express();
const friendWeb = require("./routes/friendWeb");
const circleNews = require("./routes/circleNews");
const achievements = require("./routes/achievements");
const { doesFriendOwn } = require("./controllers/achievementsController");

app.use(cors());

app.use("/friendWeb", friendWeb);
app.use("/circleNews", circleNews);
app.use("/achievements", achievements);

app.listen(5011, () => console.log("listening on 5011"));
