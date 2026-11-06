const axios = require("axios");
const fs = require("fs");
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
    if (id === undefined) {
      console.log("undefined id");
      return;
    }
    playersData.push(
      players
        .findOne({ _id: id })
        .then((record) => {
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
          if (record === null || record.updatedAt < yesterday) {
            console.log("Steam retreival for player with id " + id);
            const retreivedPlayer = retreivePlayerInfo(key, id);
            if (retreivedPlayerInfo === null) return null;
            else
              retreivedPlayer.then(({ id, ...resPlayer }) => {
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
    .then((player) => {
      if (player === undefined) {
        return {
          id: id,
          name: null,
          image: null,
          games: null,
        };
      }
      const { personaname, avatarfull } = player;
      return axios
        .get(
          "https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/",
          {
            params: { key: key, steamid: id },
          },
        )
        .then((resGames) => resGames.data.response)
        .then((gamesList) => {
          if (gamesList.games === undefined) {
            return {
              id: id,
              name: personaname,
              image: avatarfull,
              games: [],
            };
          }
          const games = {};
          gamesList.games.map(
            ({ appid, playtime_forever, rtime_last_played }) => {
              games[appid] = {
                playtime: playtime_forever,
                lastPlayed: rtime_last_played,
              };
            },
          );
          return {
            id: id,
            name: personaname,
            image: avatarfull,
            games: games,
          };
        });
    })
    .catch((e) => {
      fs.writeFileSync("retreivePlayers.txt", e.message);
      console.log("failed on user " + id);
      console.log(e);
    });
};

module.exports = { getPlayersInfo };
