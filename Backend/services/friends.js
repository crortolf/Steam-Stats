const axios = require("axios");
const mc = require("mongodb");
const { isStale, cacheFailure, scopedId } = require("./cache");

const mongo = new mc.MongoClient("mongodb://localhost:27017", {
  serverApi: {
    version: mc.ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}).db("Steam-Stats");

/**
 * Lists the steam ids of a player's friends.
 *
 * Reads the friend list through getFriendEntries (cache first, then steam) and
 * keeps only each friend's id.
 *
 * @param {string} key - The signed in user's steam api key. The cached list is kept per key.
 * @param {string} id - The 64-bit steam id of the player whose friends to list.
 * @returns {Promise<string[]>} The friends' steam ids; empty if the list is private or unavailable.
 */
const getIds = (key, id) =>
  getFriendEntries(key, id).then((friends) => friends.map(({ id }) => id));

/**
 * Finds when two players became friends.
 *
 * Reads userId's friend list through getFriendEntries and looks for friendId in it.
 *
 * @param {string} key - The signed in user's steam api key.
 * @param {string} userId - The steam id whose friend list is read.
 * @param {string} friendId - The steam id to look for in that list.
 * @returns {Promise<number|null>} A unix timestamp in seconds, or null if they
 *   aren't friends or the friend list is private.
 */
const getFriendSince = (key, userId, friendId) =>
  getFriendEntries(key, userId).then(
    (friends) => friends.find(({ id }) => id === friendId)?.friendSince ?? null,
  );

/**
 * Gets a player's friend list, from the cache when it's fresh and from steam otherwise.
 *
 * Looks up the FriendsList record for this key and player. If it's missing or
 * stale (see isStale), it asks steam's GetFriendList, saves the result with a
 * new updatedAt, and returns it. If steam fails (usually a private profile), it
 * records the failure so steam isn't asked again for a while, and falls back on
 * the stored list.
 *
 * Lists are cached per api key (see keyScope in cache.js), so a friends-only
 * list read with one user's key is never shown to another user.
 *
 * @param {string} key - The signed in user's steam api key.
 * @param {string} id - The 64-bit steam id of the player whose friends to get.
 * @returns {Promise<{id: string, friendSince: number}[]>} Each friend's steam id
 *   and when they became friends (unix seconds); empty if nothing is available.
 */
const getFriendEntries = (key, id) => {
  const fl = mongo.collection("FriendsList");
  const _id = scopedId(key, id);

  return fl.findOne({ _id }).then((record) => {
    if (isStale(record)) {
      console.log("steam retrieval");
      return axios
        .get("https://api.steampowered.com/ISteamUser/GetFriendList/v0001/", {
          params: {
            key: key,
            steamid: id,
            relationship: "friend",
          },
        })
        .then((response) => {
          const friends = response.data.friendslist.friends.map(
            ({ steamid, friend_since }) => {
              return { id: steamid, friendSince: friend_since };
            },
          );

          fl.updateOne(
            { _id },
            {
              $setOnInsert: {
                _id,
                steamId: id,
              },
              $set: {
                friends: friends,
                updatedAt: new Date(),
              },
              $unset: { failedAt: "" },
            },
            { upsert: true },
          ).catch((e) => console.log(e.message));

          return friends;
        })
        .catch((e) => {
          //private profiles fail here, fall back on whatever we have stored
          console.log("failed on friends of " + id + ": " + e.message);
          cacheFailure(fl, { _id });
          return record?.friends ?? [];
        });
    }
    console.log("Database retreival");
    return record.friends ?? [];
  });
};

module.exports = { getIds, getFriendSince };
