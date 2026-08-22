const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
// const testRoutes = require("./routes/myTestRoutes");
// const calculator = require("./routes/calculator");
const friendWeb = require("./routes/friendWeb");
//const circleNews = require("./routes/circleNews");

app.use("/friendWeb", friendWeb);
//app.use("/circleNews", circleNews);

app.listen(5011, () => console.log("listening on 5011"));
