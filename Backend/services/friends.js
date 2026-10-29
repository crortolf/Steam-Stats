const axios = require("axios");
const mc = require("mongodb");

const mongo = new mc.MongoClient("mongodb://localhost:27017", {
  serverApi: {
    version: mc.ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}).db("Steam-Stats");

const getIds = (key, id) => {
  const fl = mongo.collection("FriendsList");

  return fl.findOne({ _id: id }).then((record) => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (record === null || record.updatedAt < yesterday) {
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
            { _id: id },
            {
              $setOnInsert: {
                _id: id,
                updatedAt: new Date(),
              },
              $set: {
                friends: friends,
              },
            },
            { upsert: true },
          );

          return friends.map(({ id }) => id);
        });
    }
    console.log("Database retreival");
    return record.friends.map(({ id }) => id);
  });
};

module.exports = { getIds };
