const express = require("express");
const router = express.Router();
const {
  signUp,
  logIn,
  logOut,
  requireUser,
  getMe,
  changePassword,
  setSteamApiKey,
  setSteamId,
  requireSameOrigin,
} = require("../controllers/authController");

router.use(requireSameOrigin);

router.use(express.json());

//each handler is documented in controllers/authController.js
router.post("/signup", signUp);
router.post("/login", logIn);
router.post("/logout", logOut);
router.get("/me", requireUser, getMe);
router.put("/password", requireUser, changePassword);
router.put("/steamApiKey", requireUser, setSteamApiKey);
router.put("/steamId", requireUser, setSteamId);

/**
 * Error handler for every /auth route.
 *
 * Never sends error details or request contents back, or logs them, since
 * they can hold passwords. Only the error's message is logged.
 *
 * @param {Error & {status?: number}} error - The error a handler threw.
 * @param {import("express").Request} req
 * @param {import("express").Response} response - error.status (or 500) with a
 *   generic { error } message.
 * @param {Function} next - Unused, but express needs four parameters to treat
 *   this as an error handler.
 */
router.use((error, req, response, next) => {
  console.log("auth request failed: " + error.message);
  response
    .status(error.status ?? 500)
    .json({ error: "Something went wrong. Please try again." });
});

module.exports = router;
