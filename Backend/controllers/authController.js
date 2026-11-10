const {
  SESSION_LENGTH_MS,
  isSteamApiKeyAccepted,
  createUser,
  checkCredentials,
  verifyPassword,
  updatePassword,
  updateSteamApiKey,
  updateSteamId,
  resolveSteamId,
  createSession,
  getSessionUser,
  deleteSession,
  deleteOtherSessions,
} = require("../services/users");

const { FRONTEND_ORIGIN } = require("../config");

const SESSION_COOKIE = "session";

//the session cookie is sent automatically, so only accept changes that come from our own site
const requireSameOrigin = (req, response, next) => {
  const origin = req.headers.origin;
  if (
    req.method !== "GET" &&
    origin !== undefined &&
    origin !== FRONTEND_ORIGIN
  ) {
    return response.status(403).json({ error: "Request not allowed." });
  }
  next();
};
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//steam web api keys are 32 hexadecimal characters
const STEAM_API_KEY_PATTERN = /^[A-Fa-f0-9]{32}$/;

const MAX_FAILED_LOGINS = 10;
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;
//email -> { count, resetAt }, starts empty whenever the server restarts
const failedLogins = new Map();

const isValidPassword = (password) => {
  return (
    typeof password === "string" &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH
  );
};

const normalizeEmail = (email) => {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
};

//only what the frontend needs, never the password hash
const toPublicUser = (user) => {
  return {
    email: user._id,
    steamApiKey: user.steamApiKey,
    //accounts made before steam ids were stored don't have the field
    steamId: user.steamId ?? null,
  };
};

const readSessionToken = (req) => {
  for (const cookie of (req.headers.cookie ?? "").split(";")) {
    const [name, value] = cookie.trim().split("=");
    if (name === SESSION_COOKIE) return value;
  }
  return null;
};

const startSession = async (response, email) => {
  const token = await createSession(email);
  response.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_LENGTH_MS,
  });
};

const isLoginBlocked = (email) => {
  const record = failedLogins.get(email);
  if (record === undefined) return false;
  if (record.resetAt < Date.now()) {
    failedLogins.delete(email);
    return false;
  }
  return record.count >= MAX_FAILED_LOGINS;
};

const recordFailedLogin = (email) => {
  const record = failedLogins.get(email);
  if (record === undefined || record.resetAt < Date.now()) {
    failedLogins.set(email, {
      count: 1,
      resetAt: Date.now() + FAILED_LOGIN_WINDOW_MS,
    });
  } else {
    record.count++;
  }
};

const signUp = async (req, response) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!EMAIL_PATTERN.test(email)) {
    return response.status(400).json({ error: "Enter a valid email address." });
  }
  if (!isValidPassword(password)) {
    return response.status(400).json({
      error: `Passwords must be ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters.`,
    });
  }

  try {
    const user = await createUser(email, password);
    await startSession(response, email);
    response.status(201).json(toPublicUser(user));
  } catch (error) {
    if (error.code === 11000) {
      return response
        .status(409)
        .json({ error: "An account with that email already exists." });
    }
    throw error;
  }
};

const logIn = async (req, response) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (typeof password !== "string" || password.length > MAX_PASSWORD_LENGTH) {
    return response.status(401).json({ error: "Incorrect email or password." });
  }
  if (isLoginBlocked(email)) {
    return response
      .status(429)
      .json({ error: "Too many failed attempts. Try again in 15 minutes." });
  }

  const user = await checkCredentials(email, password);
  if (user === null) {
    recordFailedLogin(email);
    return response.status(401).json({ error: "Incorrect email or password." });
  }

  failedLogins.delete(email);
  await startSession(response, email);
  response.json(toPublicUser(user));
};

const logOut = async (req, response) => {
  const token = readSessionToken(req);
  if (token) await deleteSession(token);
  response.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax" });
  response.status(204).end();
};

//loads the signed in user for the routes after it, answers 401 if there isn't one
const requireUser = async (req, response, next) => {
  const token = readSessionToken(req);
  const user = token ? await getSessionUser(token) : null;
  if (user === null) {
    return response.status(401).json({ error: "Please sign in." });
  }
  req.user = user;
  req.sessionToken = token;
  next();
};

//for routes that call steam: every request uses the signed in user's own key
const requireSteamApiKey = (req, response, next) => {
  requireUser(req, response, () => {
    if (!req.user.steamApiKey) {
      return response
        .status(403)
        .json({ error: "Add your Steam API key on your profile first." });
    }
    req.steamApiKey = req.user.steamApiKey;
    next();
  }).catch(next);
};

const getMe = (req, response) => {
  response.json(toPublicUser(req.user));
};

const changePassword = async (req, response) => {
  const { currentPassword, newPassword } = req.body ?? {};

  if (!isValidPassword(newPassword)) {
    return response.status(400).json({
      error: `Passwords must be ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters.`,
    });
  }
  if (
    typeof currentPassword !== "string" ||
    currentPassword.length > MAX_PASSWORD_LENGTH ||
    !(await verifyPassword(currentPassword, req.user.passwordHash))
  ) {
    return response
      .status(401)
      .json({ error: "Your current password is incorrect." });
  }

  await updatePassword(req.user._id, newPassword);
  await deleteOtherSessions(req.user._id, req.sessionToken);
  response.status(204).end();
};

const setSteamApiKey = async (req, response) => {
  const steamApiKey =
    typeof req.body?.steamApiKey === "string"
      ? req.body.steamApiKey.trim()
      : "";

  if (!STEAM_API_KEY_PATTERN.test(steamApiKey)) {
    return response
      .status(400)
      .json({ error: "Steam API keys are 32 letters and numbers." });
  }

  let accepted;
  try {
    accepted = await isSteamApiKeyAccepted(steamApiKey);
  } catch (error) {
    console.log("couldn't check steam api key: " + error.message);
    return response
      .status(502)
      .json({ error: "Steam couldn't check your key. Please try again." });
  }
  if (!accepted) {
    return response.status(400).json({ error: "Steam didn't accept that key." });
  }

  await updateSteamApiKey(req.user._id, steamApiKey);
  response.json(toPublicUser({ ...req.user, steamApiKey }));
};

const MAX_STEAM_ID_INPUT_LENGTH = 200;

//saves the steam account whose data the site shows to this user
const setSteamId = async (req, response) => {
  const input =
    typeof req.body?.steamId === "string" ? req.body.steamId.trim() : "";
  if (input === "" || input.length > MAX_STEAM_ID_INPUT_LENGTH) {
    return response
      .status(400)
      .json({ error: "Enter your Steam ID or profile URL." });
  }

  let steamId;
  try {
    steamId = await resolveSteamId(req.user.steamApiKey, input);
  } catch (error) {
    console.log("couldn't resolve steam id: " + error.message);
    return response
      .status(502)
      .json({ error: "Steam couldn't look up that profile. Please try again." });
  }
  if (steamId === null) {
    return response.status(400).json({
      error: req.user.steamApiKey
        ? "Steam couldn't find that profile."
        : "Enter a 17-digit Steam ID, or add your API key first to use a custom URL.",
    });
  }

  await updateSteamId(req.user._id, steamId);
  response.json(toPublicUser({ ...req.user, steamId }));
};

module.exports = {
  signUp,
  logIn,
  logOut,
  requireUser,
  requireSteamApiKey,
  getMe,
  changePassword,
  setSteamApiKey,
  setSteamId,
  requireSameOrigin,
};
