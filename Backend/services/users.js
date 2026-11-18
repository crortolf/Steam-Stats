const axios = require("axios");
const crypto = require("crypto");
const { promisify } = require("util");
const mc = require("mongodb");

const mongo = new mc.MongoClient("mongodb://localhost:27017", {
  serverApi: {
    version: mc.ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}).db("Steam-Stats");

const users = mongo.collection("Users");
const sessions = mongo.collection("Sessions");

const scrypt = promisify(crypto.scrypt);

const SCRYPT_N = 2 ** 17;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;
const SESSION_LENGTH_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Runs a password through scrypt, the slow hash that makes guessing passwords expensive.
 *
 * @param {string} password - The password.
 * @param {Buffer} salt - Random bytes stored with the hash.
 * @param {number} n - scrypt's cost (memory and time).
 * @param {number} r - scrypt's block size.
 * @param {number} p - scrypt's parallelism.
 * @returns {Promise<Buffer>} The 64-byte derived key.
 */
const deriveKey = (password, salt, n, r, p) => {
  return scrypt(password, salt, SCRYPT_KEY_LENGTH, {
    N: n,
    r: r,
    p: p,
    maxmem: 256 * n * r,
  });
};

/**
 * Hashes a new password for storage.
 *
 * Makes a random 16-byte salt, runs deriveKey with the current settings, and
 * joins everything into one string. Storing the settings with each hash means
 * they can change later without breaking old hashes.
 *
 * @param {string} password - The password to hash.
 * @returns {Promise<string>} "scrypt$N$r$p$<salt base64>$<hash base64>"
 */
const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16);
  const key = await deriveKey(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
};

/**
 * Checks a password against a stored hash.
 *
 * Reads the settings and salt out of the stored string, hashes the password
 * the same way, and compares the results with timingSafeEqual so the time
 * taken doesn't hint at how close a guess was.
 *
 * @param {string} password - The password to check.
 * @param {string} storedHash - A string made by hashPassword.
 * @returns {Promise<boolean>} true if the password matches.
 */
const verifyPassword = async (password, storedHash) => {
  const [, n, r, p, salt, hash] = storedHash.split("$");
  const expected = Buffer.from(hash, "base64");
  const key = await deriveKey(
    password,
    Buffer.from(salt, "base64"),
    Number(n),
    Number(r),
    Number(p),
  );
  return crypto.timingSafeEqual(key, expected);
};

//used when an email has no account, so both cases take the same time to answer
const dummyHashPromise = hashPassword(crypto.randomBytes(32).toString("hex"));

/**
 * Loads an account.
 *
 * @param {string} email - The account's email, which is its _id.
 * @returns {Promise<object|null>} The user ({ _id, passwordHash, steamApiKey,
 *   steamId, createdAt, updatedAt }), or null if there's no such account.
 */
const getUser = (email) => users.findOne({ _id: email });

/**
 * Creates an account with no steam details yet.
 *
 * Hashes the password and inserts the user. It's an insert, not an upsert,
 * so signing up can't overwrite an existing account.
 *
 * @param {string} email - The new account's email, used as its _id.
 * @param {string} password - The chosen password.
 * @returns {Promise<object>} The new user document. Rejects with code 11000 if
 *   the email is taken.
 */
const createUser = async (email, password) => {
  const now = new Date();
  const user = {
    _id: email,
    passwordHash: await hashPassword(password),
    steamApiKey: null,
    steamId: null,
    createdAt: now,
    updatedAt: now,
  };
  await users.insertOne(user);
  return user;
};

/**
 * Checks an email and password for signing in.
 *
 * Loads the account and verifies the password. When there's no account it
 * checks against a throwaway hash anyway, so the answer takes the same time
 * either way and doesn't reveal which emails have accounts.
 *
 * @param {string} email - The account's email.
 * @param {string} password - The password typed in.
 * @returns {Promise<object|null>} The user if the password is correct, otherwise null.
 */
const checkCredentials = async (email, password) => {
  const user = await getUser(email);
  const matches = await verifyPassword(
    password,
    user?.passwordHash ?? (await dummyHashPromise),
  );
  return user !== null && matches ? user : null;
};

/**
 * Replaces an account's password.
 *
 * @param {string} email - The account's email.
 * @param {string} password - The new password; it's hashed before saving.
 * @returns {Promise<void>}
 */
const updatePassword = async (email, password) => {
  await users.updateOne(
    { _id: email },
    {
      $set: {
        passwordHash: await hashPassword(password),
        updatedAt: new Date(),
      },
    },
  );
};

/**
 * Saves (or clears) an account's steam api key.
 *
 * @param {string} email - The account's email.
 * @param {string|null} steamApiKey - The key, or null to remove it.
 * @returns {Promise<void>}
 */
const updateSteamApiKey = async (email, steamApiKey) => {
  await users.updateOne(
    { _id: email },
    { $set: { steamApiKey: steamApiKey, updatedAt: new Date() } },
  );
};

/**
 * Saves (or clears) which steam account an account belongs to.
 *
 * @param {string} email - The account's email.
 * @param {string|null} steamId - A 64-bit steam id, or null to remove it.
 * @returns {Promise<void>}
 */
const updateSteamId = async (email, steamId) => {
  await users.updateOne(
    { _id: email },
    { $set: { steamId: steamId, updatedAt: new Date() } },
  );
};

const STEAM_ID64_PATTERN = /^7656119\d{10}$/;

/**
 * Turns what a user typed into a 64-bit steam id.
 *
 * Trims the input and any trailing slashes, then tries, in order: a bare steam
 * id; a steamcommunity.com/profiles/<id> url; a steamcommunity.com/id/<name>
 * url or a bare custom url name. Names are looked up with steam's
 * ResolveVanityURL, which needs an api key.
 *
 * @param {string|null} steamApiKey - The user's steam api key, needed only for names.
 * @param {string} input - A steam id, profile url, custom url, or custom url name.
 * @returns {Promise<string|null>} The steam id, or null if the input isn't one
 *   of those, a name can't be looked up without a key, or steam doesn't know
 *   the name. Rejects if the steam request fails.
 */
const resolveSteamId = async (steamApiKey, input) => {
  const text = input.trim().replace(/\/+$/, "");
  if (STEAM_ID64_PATTERN.test(text)) return text;

  const profile = text.match(/steamcommunity\.com\/profiles\/(\d+)$/i);
  if (profile) return STEAM_ID64_PATTERN.test(profile[1]) ? profile[1] : null;

  const vanity =
    text.match(/steamcommunity\.com\/id\/([\w-]+)$/i)?.[1] ??
    (/^[\w-]{2,32}$/.test(text) ? text : null);
  if (vanity === null || !steamApiKey) return null;

  const response = await axios.get(
    "https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/",
    { params: { key: steamApiKey, vanityurl: vanity } },
  );
  //success is 1 when the name was found
  return response.data.response?.success === 1
    ? response.data.response.steamid
    : null;
};

/**
 * Checks whether steam accepts an api key.
 *
 * Asks steam for a well-known public profile with the key. Steam answers 401
 * or 403 if the key is invalid.
 *
 * @param {string} steamApiKey - The key to check.
 * @returns {Promise<boolean>} true if steam answered, false if it refused the
 *   key. Rejects on any other error (ex: steam is down), so callers don't
 *   mistake an outage for a bad key.
 */
const isSteamApiKeyAccepted = (steamApiKey) => {
  return axios
    .get("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/", {
      params: { key: steamApiKey, steamids: "76561197960435530" },
    })
    .then(() => true)
    .catch((error) => {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return false;
      }
      throw error;
    });
};

/**
 * Hashes a session token for storage. Only the hash is stored, so reading the
 * database doesn't give anyone a session.
 *
 * @param {string} token - The token from the session cookie.
 * @returns {string} Its SHA-256 hash in hex.
 */
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Signs a user in by starting a new session.
 *
 * Makes a random 32-byte token and stores its hash with the user and an
 * expiry two weeks away.
 *
 * @param {string} email - The account to sign in.
 * @returns {Promise<string>} The token (base64url), to send to the browser in a cookie.
 */
const createSession = async (email) => {
  const token = crypto.randomBytes(32).toString("base64url");
  const now = new Date();
  await sessions.insertOne({
    _id: hashToken(token),
    userId: email,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_LENGTH_MS),
  });
  return token;
};

/**
 * Finds who a session token belongs to.
 *
 * Looks the session up by the token's hash, rejects it if it has expired (mongo
 * also removes expired sessions on its own, but not instantly), and loads the user.
 *
 * @param {string} token - The token from the session cookie.
 * @returns {Promise<object|null>} The signed in user, or null if the token
 *   isn't a current session.
 */
const getSessionUser = async (token) => {
  const session = await sessions.findOne({ _id: hashToken(token) });
  if (session === null || session.expiresAt < new Date()) return null;
  return getUser(session.userId);
};

/**
 * Signs out one session.
 *
 * @param {string} token - The token from the session cookie.
 * @returns {Promise<void>}
 */
const deleteSession = async (token) => {
  await sessions.deleteOne({ _id: hashToken(token) });
};

/**
 * Signs a user out everywhere except the current session, ex: after a password change.
 *
 * @param {string} email - The account.
 * @param {string} token - The current session's token, which is kept.
 * @returns {Promise<void>}
 */
const deleteOtherSessions = async (email, token) => {
  await sessions.deleteMany({
    userId: email,
    _id: { $ne: hashToken(token) },
  });
};

//mongo removes sessions on its own once expiresAt passes
sessions
  .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  .catch((e) => console.log(e.message));

module.exports = {
  SESSION_LENGTH_MS,
  getUser,
  createUser,
  checkCredentials,
  verifyPassword,
  updatePassword,
  updateSteamApiKey,
  updateSteamId,
  resolveSteamId,
  isSteamApiKeyAccepted,
  createSession,
  getSessionUser,
  deleteSession,
  deleteOtherSessions,
};
