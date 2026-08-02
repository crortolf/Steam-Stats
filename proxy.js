// server.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/api/steam/*path", async (req, res) => {
  try {
    const steamPath = req.params.path.join("/");
    console.log(req.query);
    console.log(steamPath);
    const response = await axios.get(
      `https://api.steampowered.com/` + steamPath,
      {
        params: req.query,
      },
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => console.log("Proxy running on http://localhost:3001"));
