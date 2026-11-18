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

/**
 * Wraps an async handler so its errors reach the error handler below instead
 * of going unhandled.
 *
 * @param {Function} fn - An express handler or middleware that may return a promise.
 * @returns {Function} A handler that calls fn and passes any rejection to next.
 */
const handle = (fn) => (req, response, next) =>
  Promise.resolve(fn(req, response, next)).catch(next);

/**
 * Middleware for routes that use the user's steam data: needs a signed in user
 * with both an api key and a steam account saved.
 *
 * Runs requireSteamApiKey, then checks req.user.steamId.
 *
 * @param {import("express").Request} req - Sets req.user, req.sessionToken
 *   and req.steamApiKey for the handlers after it.
 * @param {import("express").Response} response - 401 { error } if signed out;
 *   403 { error } without a key or a steam account.
 * @param {Function} next - Called when the request may continue.
 * @returns {void}
 */
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
  handle((req, res) => getFeed(req, res, { scope: "all" })),
);
//the signed in user's own recommendations, newest first
router.get(
  "/mine",
  requireUser,
  handle((req, res) => getFeed(req, res, { scope: "mine" })),
);
//recommendations by the user's steam friends, newest first; the friend list
//comes from steam, so this needs a key and steam id
router.get(
  "/friends",
  requireSteamAccount,
  handle((req, res) => getFeed(req, res, { scope: "friends" })),
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

//each handler above is documented in controllers/recommendationsController.js
//or controllers/recommendationImagesController.js

/**
 * Error handler for every /recommendations route. Never sends error details back.
 *
 * @param {Error} error - The error a handler threw; its message is logged.
 * @param {import("express").Request} req
 * @param {import("express").Response} response - 500 with a generic { error } message.
 * @param {Function} next - Unused, but express needs four parameters to treat
 *   this as an error handler.
 */
router.use((error, req, response, next) => {
  console.log("recommendations request failed: " + error.message);
  response
    .status(500)
    .json({ error: "Something went wrong. Please try again." });
});

module.exports = router;
