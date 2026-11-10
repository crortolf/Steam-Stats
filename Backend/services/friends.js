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

//returns the ids of a player's friends, see getFriendEntries
const getIds = (key, id) =>
  getFriendEntries(key, id).then((friends) => friends.map(({ id }) => id));

//returns when two players became friends as a unix timestamp (seconds),
//or null if they aren't friends or the friend list is private
const getFriendSince = (key, userId, friendId) =>
  getFriendEntries(key, userId).then(
    (friends) => friends.find(({ id }) => id === friendId)?.friendSince ?? null,
  );

//returns a player's friends as { id, friendSince }, reading the cache before asking steam
//cached per api key (see keyScope in cache.js): a friends-only list read with
//one user's key is never shown to another user
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
