const mc = require("mongodb");

const mongo = new mc.MongoClient("mongodb://localhost:27017", {
  serverApi: {
    version: mc.ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}).db("Steam-Stats");

//players whose usernames were marked inappropriate, keyed by steam id
const flaggedUsers = mongo.collection("FlaggedUsers");

/**
 * Finds which of the given players have been flagged for an inappropriate username.
 *
 * Drops anything that isn't a string id, then looks the rest up in the
 * FlaggedUsers collection in one query, fetching only the _id of each match.
 *
 * @param {string[]} steamIds - 64-bit steam ids to check. Non-string entries are ignored.
 * @returns {Promise<Set<string>>} The ids from steamIds that are flagged; empty if none are.
 */
const getFlaggedIds = async (steamIds) => {
  const ids = steamIds.filter((id) => typeof id === "string");
  if (ids.length === 0) return new Set();
  const records = await flaggedUsers
    .find({ _id: { $in: ids } }, { projection: { _id: 1 } })
    .toArray();
  return new Set(records.map((r) => r._id));
};

/**
 * Hides a flagged player's name behind asterisks.
 *
 * Spreads the string into an array so each emoji or other multi-unit character
 * counts as one, then repeats "*" that many times.
 *
 * @param {string} name - The name to hide.
 * @returns {string} One asterisk per character, or "****" if name is empty or not a string.
 */
const maskName = (name) =>
  typeof name === "string" && name.length > 0 ? "*".repeat([...name].length) : "****";

module.exports = { getFlaggedIds, maskName };
