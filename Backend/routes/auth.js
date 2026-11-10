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

router.post("/signup", signUp);
router.post("/login", logIn);
router.post("/logout", logOut);
router.get("/me", requireUser, getMe);
router.put("/password", requireUser, changePassword);
router.put("/steamApiKey", requireUser, setSteamApiKey);
router.put("/steamId", requireUser, setSteamId);

//never send error details or request contents back, or log them, they can hold passwords
router.use((error, req, response, next) => {
  console.log("auth request failed: " + error.message);
  response
    .status(error.status ?? 500)
    .json({ error: "Something went wrong. Please try again." });
});

module.exports = router;
