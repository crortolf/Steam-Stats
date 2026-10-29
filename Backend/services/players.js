const axios = require("axios");
const mc = require("mongodb");

const mongo = new mc.MongoClient("mongodb://localhost:27017", {
  serverApi: {
    version: mc.ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}).db("Steam-Stats");

const getPlayersInfo = (key, ids) => {
  const players = mongo.collection("Players");
  const playersData = [];

  for (const id of ids) {
    playersData.push(
      players
        .findOne({ _id: id })
        .then((record) => {
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
          if (record === null || record.updatedAt < yesterday) {
            return retrievePlayerInfo(key, id).then(({ id, ...resPlayer }) => {
              const newPlayer = {
                _id: id,
                ...resPlayer,
                updatedAt: new Date(),
              };
              players.insertOne(newPlayer);

              return newPlayer;
            });
          }

          return record;
        })
        .then(({ _id, updatedAt, ...resRecord }) => {
          return { id: _id, ...resRecord };
        })
        .catch((e) => console.log(e)),
    );
  }

  return Promise.all(playersData);
};

const retrievePlayerInfo = (key, id) => {
  return axios
    .get("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/", {
      params: { key: key, steamids: id },
    })
    .then((resPlayer) => resPlayer.data.response.players[0])
    .then(({ personaname, avatarfull }) => {
      return axios
        .get(
          "https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/",
          {
            params: { key: key, steamid: id },
          },
        )
        .then((resGames) => resGames.data.response.games)
        .then((gamesList) => {
          const games = {};
          gamesList.map(({ appid, playtime_forever, rtime_last_played }) => {
            games[appid] = {
              playtime: playtime_forever,
              lastPlayed: rtime_last_played,
            };
          });
          return {
            id: id,
            name: personaname,
            image: avatarfull,
            games: games,
          };
        });
    });
};

module.exports = { getPlayersInfo };
