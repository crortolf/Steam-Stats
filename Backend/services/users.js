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

const deriveKey = (password, salt, n, r, p) => {
  return scrypt(password, salt, SCRYPT_KEY_LENGTH, {
    N: n,
    r: r,
    p: p,
    maxmem: 256 * n * r,
  });
};

//stored as scrypt$N$r$p$salt$hash so the settings can change without breaking old hashes
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

const getUser = (email) => users.findOne({ _id: email });

//an insert, not an upsert, so signing up can't overwrite an existing account
//rejects with code 11000 if the email is taken
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

//returns the user only if the password is correct
const checkCredentials = async (email, password) => {
  const user = await getUser(email);
  const matches = await verifyPassword(
    password,
    user?.passwordHash ?? (await dummyHashPromise),
  );
  return user !== null && matches ? user : null;
};

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

const updateSteamApiKey = async (email, steamApiKey) => {
  await users.updateOne(
    { _id: email },
    { $set: { steamApiKey: steamApiKey, updatedAt: new Date() } },
  );
};

const updateSteamId = async (email, steamId) => {
  await users.updateOne(
    { _id: email },
    { $set: { steamId: steamId, updatedAt: new Date() } },
  );
};

const STEAM_ID64_PATTERN = /^7656119\d{10}$/;

//turns what a user typed into a 64-bit steam id, or null if it isn't one
//accepts a steam id, a steamcommunity.com/profiles/<id> or /id/<name> url, or a custom url name
//names are looked up with steam, which needs an api key
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

//asks steam about a public profile, it answers 403 if the key is invalid
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

//only a hash of the token is stored, so reading the database doesn't give anyone a session
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

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

//returns the signed in user, or null if the token isn't a current session
const getSessionUser = async (token) => {
  const session = await sessions.findOne({ _id: hashToken(token) });
  if (session === null || session.expiresAt < new Date()) return null;
  return getUser(session.userId);
};

const deleteSession = async (token) => {
  await sessions.deleteOne({ _id: hashToken(token) });
};

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
