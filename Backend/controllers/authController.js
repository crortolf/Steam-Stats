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

/**
 * Middleware that blocks changes coming from other websites. The session cookie
 * is sent automatically, so without this another site could make requests as the user.
 *
 * Lets every GET through. For other methods, rejects the request if the
 * browser's Origin header names a site other than the frontend. Requests
 * without an Origin (not from a browser page) are allowed.
 *
 * @param {import("express").Request} req - Reads req.method and the Origin header.
 * @param {import("express").Response} response - Answers 403 { error } when blocked.
 * @param {Function} next - Called when the request may continue.
 * @returns {void}
 */
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

/**
 * Checks that a new password is acceptable.
 *
 * @param {unknown} password - The password from the request body.
 * @returns {boolean} true if it's a string of 8 to 200 characters.
 */
const isValidPassword = (password) => {
  return (
    typeof password === "string" &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH
  );
};

/**
 * Puts an email into the form accounts are stored under, so "A@B.com " and
 * "a@b.com" are the same account.
 *
 * @param {unknown} email - The email from the request body.
 * @returns {string} The email trimmed and lowercased, or "" if it isn't a string.
 */
const normalizeEmail = (email) => {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
};

/**
 * Picks the account details that are safe to send to the browser. Never the password hash.
 *
 * @param {object} user - A user document from the database.
 * @returns {{email: string, steamApiKey: string|null, steamId: string|null}}
 *   steamId is null for accounts made before steam ids were stored.
 */
const toPublicUser = (user) => {
  return {
    email: user._id,
    steamApiKey: user.steamApiKey,
    //accounts made before steam ids were stored don't have the field
    steamId: user.steamId ?? null,
  };
};

/**
 * Reads the session token out of the request's cookies.
 *
 * Splits the Cookie header on ";" and returns the value of the "session" cookie.
 *
 * @param {import("express").Request} req - Reads the Cookie header.
 * @returns {string|null} The token, or null if there's no session cookie.
 */
const readSessionToken = (req) => {
  for (const cookie of (req.headers.cookie ?? "").split(";")) {
    const [name, value] = cookie.trim().split("=");
    if (name === SESSION_COOKIE) return value;
  }
  return null;
};

/**
 * Signs a user in: creates a session and sets its cookie on the response.
 *
 * The cookie is httpOnly (page scripts can't read it), sameSite lax, secure in
 * production, and lasts as long as the session.
 *
 * @param {import("express").Response} response - The response to set the cookie on.
 * @param {string} email - The account to sign in.
 * @returns {Promise<void>}
 */
const startSession = async (response, email) => {
  const token = await createSession(email);
  response.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_LENGTH_MS,
  });
};

/**
 * Checks whether an email is locked out after too many wrong passwords.
 *
 * Looks the email up in the in-memory failed login counts. A count whose
 * 15-minute window has passed is removed and doesn't block.
 *
 * @param {string} email - The normalized email.
 * @returns {boolean} true if there have been 10 or more failures in the current window.
 */
const isLoginBlocked = (email) => {
  const record = failedLogins.get(email);
  if (record === undefined) return false;
  if (record.resetAt < Date.now()) {
    failedLogins.delete(email);
    return false;
  }
  return record.count >= MAX_FAILED_LOGINS;
};

/**
 * Counts one wrong password for an email.
 *
 * Starts a new 15-minute window with a count of 1 if there's no current one,
 * otherwise adds one to the count.
 *
 * @param {string} email - The normalized email.
 * @returns {void}
 */
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

/**
 * POST /auth/signup. Creates an account and signs the user in.
 *
 * Normalizes the email, checks it and the password, creates the user and
 * starts a session.
 *
 * @param {import("express").Request} req - req.body: { email, password }.
 * @param {import("express").Response} response - 201 with the public user and a
 *   session cookie; 400 { error } for an invalid email or password; 409 { error }
 *   if the email is taken.
 * @returns {Promise<void>} Rejects on unexpected database errors.
 */
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

/**
 * POST /auth/login. Signs a user in with their email and password.
 *
 * Rejects oversized passwords without hashing them, refuses emails that are
 * locked out, then checks the credentials. Wrong passwords are counted toward
 * the lockout; a correct one clears the count and starts a session.
 *
 * @param {import("express").Request} req - req.body: { email, password }.
 * @param {import("express").Response} response - 200 with the public user and a
 *   session cookie; 401 { error } for a wrong email or password (the same
 *   message either way); 429 { error } when locked out.
 * @returns {Promise<void>}
 */
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

/**
 * POST /auth/logout. Signs the current session out.
 *
 * Deletes the session if there is one and clears the cookie either way.
 *
 * @param {import("express").Request} req - Reads the session cookie.
 * @param {import("express").Response} response - Always 204 with no body.
 * @returns {Promise<void>}
 */
const logOut = async (req, response) => {
  const token = readSessionToken(req);
  if (token) await deleteSession(token);
  response.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax" });
  response.status(204).end();
};

/**
 * Middleware that only lets signed in users through, and loads who they are.
 *
 * Reads the session cookie and looks up its user.
 *
 * @param {import("express").Request} req - Reads the session cookie. Sets
 *   req.user (the user document) and req.sessionToken for the handlers after it.
 * @param {import("express").Response} response - Answers 401 { error } if
 *   there's no current session.
 * @param {Function} next - Called once the user is loaded.
 * @returns {Promise<void>}
 */
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

/**
 * Middleware for routes that call steam: only lets through signed in users who
 * have saved an api key. Every steam request uses the user's own key.
 *
 * Runs requireUser first, then checks the user's key.
 *
 * @param {import("express").Request} req - Sets req.user, req.sessionToken and
 *   req.steamApiKey for the handlers after it.
 * @param {import("express").Response} response - Answers 401 { error } if
 *   signed out, 403 { error } if there's no key.
 * @param {Function} next - Called when the request may continue, or with an
 *   error if loading the user failed.
 * @returns {void}
 */
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

/**
 * GET /auth/me. Tells the frontend who is signed in.
 *
 * @param {import("express").Request} req - Needs req.user from requireUser.
 * @param {import("express").Response} response - 200 with the public user.
 * @returns {void}
 */
const getMe = (req, response) => {
  response.json(toPublicUser(req.user));
};

/**
 * Changes the signed in user's password and signs out their other sessions.
 *
 * Checks the new password, then the current one, saves the new hash, and
 * deletes every session except this one.
 *
 * @param {import("express").Request} req - req.body: { currentPassword,
 *   newPassword }. Needs req.user and req.sessionToken from requireUser.
 * @param {import("express").Response} response - 204 when changed; 400 { error }
 *   for an invalid new password; 401 { error } if the current password is wrong.
 * @returns {Promise<void>}
 */
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

/**
 * Saves the signed in user's steam api key, once steam has accepted it.
 *
 * Trims the key, checks it's 32 hex characters, and tries it with steam
 * (isSteamApiKeyAccepted) before saving.
 *
 * @param {import("express").Request} req - req.body: { steamApiKey }. Needs req.user.
 * @param {import("express").Response} response - 200 with the updated public
 *   user; 400 { error } if the key is malformed or steam refuses it;
 *   502 { error } if steam couldn't be reached.
 * @returns {Promise<void>}
 */
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

/**
 * Saves the steam account whose data the site shows to this user.
 *
 * Accepts a steam id, profile url or custom url name, turns it into a steam id
 * with resolveSteamId (custom names need the user's api key), and saves it.
 *
 * @param {import("express").Request} req - req.body: { steamId } (whatever the
 *   user typed, up to 200 characters). Needs req.user.
 * @param {import("express").Response} response - 200 with the updated public
 *   user; 400 { error } if the input is empty, too long or can't be resolved;
 *   502 { error } if steam couldn't be reached.
 * @returns {Promise<void>}
 */
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
