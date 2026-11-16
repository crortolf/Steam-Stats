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

//returns the set of these steam ids that are flagged
const getFlaggedIds = async (steamIds) => {
  const ids = steamIds.filter((id) => typeof id === "string");
  if (ids.length === 0) return new Set();
  const records = await flaggedUsers
    .find({ _id: { $in: ids } }, { projection: { _id: 1 } })
    .toArray();
  return new Set(records.map((r) => r._id));
};

//one asterisk per character, counting emoji as one character
const maskName = (name) =>
  typeof name === "string" && name.length > 0 ? "*".repeat([...name].length) : "****";

module.exports = { getFlaggedIds, maskName };
