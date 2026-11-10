const express = require("express");
const router = express.Router();
const {
  getFeed,
  searchGames,
  getGameAchievements,
  createRecommendation,
  removeRecommendation,
} = require("../controllers/recommendationsController");
const {
  limitUploads,
  receiveUpload,
  uploadImage,
  serveImage,
  removeImage,
} = require("../controllers/recommendationImagesController");
const {
  requireUser,
  requireSteamApiKey,
  requireSameOrigin,
} = require("../controllers/authController");

//the session cookie is sent automatically, so only accept changes from our own site
router.use(requireSameOrigin);
router.use(express.json({ limit: "32kb" }));

//passes rejected promises to the error handler below
const handle = (fn) => (req, response, next) =>
  Promise.resolve(fn(req, response, next)).catch(next);

//writing or looking up games uses steam data, so it needs a key and steam id
const requireSteamAccount = (req, response, next) =>
  requireSteamApiKey(req, response, () => {
    if (!req.user.steamId) {
      return response
        .status(403)
        .json({ error: "Add your Steam account on your profile first." });
    }
    next();
  });

//everyone's recommendations, newest first
router.get(
  "/",
  requireUser,
  handle((req, res) => getFeed(req, res, { mine: false })),
);
//the signed in user's own recommendations, newest first
router.get(
  "/mine",
  requireUser,
  handle((req, res) => getFeed(req, res, { mine: true })),
);
router.get("/games", requireSteamAccount, handle(searchGames));
router.get("/achievements", requireSteamAccount, handle(getGameAchievements));
router.post("/", requireSteamAccount, handle(createRecommendation));

//images: uploaded one at a time while writing, then attached when posting
router.post(
  "/images",
  requireUser,
  handle(limitUploads),
  receiveUpload,
  handle(uploadImage),
);
router.get("/images/:id", requireUser, handle(serveImage));
//only removes uploads that aren't part of a post yet
router.delete("/images/:id", requireUser, handle(removeImage));
router.delete("/:id", requireUser, handle(removeRecommendation));

//never send error details back
router.use((error, req, response, next) => {
  console.log("recommendations request failed: " + error.message);
  response
    .status(500)
    .json({ error: "Something went wrong. Please try again." });
});

module.exports = router;
