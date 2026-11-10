const axios = require("axios");
const fs = require("fs");
const mc = require("mongodb");
const { isStale, cacheFailure, scopedId } = require("./cache");
const { requestOwnedGames } = require("./games");

const mongo = new mc.MongoClient("mongodb://localhost:27017", {
  serverApi: {
    version: mc.ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}).db("Steam-Stats");

//players' names, avatars and libraries, cached per api key (see keyScope in
//cache.js) so a library read with one user's key isn't shown to another user
const getPlayersInfo = (key, ids) => {
  const players = mongo.collection("Players");
  const playersData = [];

  for (const id of ids) {
    if (id === undefined) {
      console.log("undefined id");
      return;
    }
    const _id = scopedId(key, id);
    playersData.push(
      players
        .findOne({ _id })
        .then((record) => {
          if (isStale(record)) {
            console.log("Steam retreival for player with id " + id);
            return retrievePlayerInfo(key, id).then((retreivedPlayer) => {
              //steam request failed, fall back on whatever we have stored
              if (retreivedPlayer === undefined) {
                cacheFailure(players, { _id });
                return record;
              }

              const { id: playerId, ...resPlayer } = retreivedPlayer;
              const updatedAt = new Date();
              players
                .updateOne(
                  { _id },
                  {
                    $setOnInsert: {
                      _id,
                      steamId: playerId,
                    },
                    $set: {
                      ...resPlayer,
                      updatedAt: updatedAt,
                    },
                    $unset: { failedAt: "" },
                  },
                  { upsert: true },
                )
                .catch((e) => console.log(e.message));

              return { ...resPlayer, updatedAt };
            });
          }

          return record;
        })
        .then((record) => {
          //a record without a name field only holds a cached failure
          if (record === null || record.name === undefined) return null;
          const { _id, steamId, updatedAt, failedAt, ...resRecord } = record;
          return { id: id, ...resRecord };
        })
        .catch((e) => console.log(e.message)),
    );
  }

  return Promise.all(playersData);
};

//steam's limit on ids per GetPlayerSummaries request
const MAX_SUMMARIES_PER_REQUEST = 100;

//the player id a per-key record is about
const unscopedId = (_id) => _id.slice(_id.indexOf(":") + 1);

//returns steam's summary for each id that has one, reading the cache before asking steam
//players without a summary are left out of the result
//summaries are cached per api key (see keyScope in cache.js): steam hides more
//of a profile from strangers than from friends, so a summary read with one
//user's key is never shown to another user
//maxAgeMs overrides how old a cached summary may be before steam is asked again
//pass withUpdatedAt to keep each summary's updatedAt (when it was fetched from steam)
const retrievePlayerSummaries = (
  key,
  ids,
  { maxAgeMs, withUpdatedAt = false } = {},
) => {
  const summaries = mongo.collection("PlayerSummaries");

  return summaries
    .find({ _id: { $in: ids.map((id) => scopedId(key, id)) } })
    .toArray()
    .then((records) => {
      //keyed by player id rather than the scoped _id
      const recordsById = {};
      for (const { _id, steamId, ...record } of records) {
        recordsById[unscopedId(_id)] = record;
      }

      const staleIds = ids.filter((id) =>
        isStale(recordsById[id] ?? null, maxAgeMs),
      );
      const requests = [];
      for (let i = 0; i < staleIds.length; i += MAX_SUMMARIES_PER_REQUEST) {
        requests.push(
          requestPlayerSummaries(
            key,
            staleIds.slice(i, i + MAX_SUMMARIES_PER_REQUEST),
            summaries,
          ),
        );
      }

      return Promise.all(requests).then((retrieved) => {
        for (const { steamid, ...record } of retrieved.flat()) {
          recordsById[steamid] = record;
        }

        return ids
          .filter((id) => recordsById[id]?.personaname !== undefined)
          .map((id) => {
            const { updatedAt, failedAt, ...summary } = recordsById[id];
            return withUpdatedAt
              ? { steamid: id, ...summary, updatedAt }
              : { steamid: id, ...summary };
          });
      });
    });
};

//asks steam for one batch of summaries, caches the results under this key and
//returns them as { steamid, ...summary, updatedAt }
const requestPlayerSummaries = (key, ids, summaries) => {
  console.log("steam retreival for summaries of " + ids.length + " players");
  return axios
    .get("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/", {
      params: { key: key, steamids: ids.join(",") },
    })
    .then((response) => response.data.response.players)
    .then((retrievedPlayers) => {
      const records = [];
      for (const { steamid, ...summary } of retrievedPlayers) {
        const _id = scopedId(key, steamid);
        const updatedAt = new Date();
        summaries
          .updateOne(
            { _id },
            {
              $setOnInsert: {
                _id,
                steamId: steamid,
              },
              $set: {
                ...summary,
                updatedAt: updatedAt,
              },
              $unset: { failedAt: "" },
            },
            { upsert: true },
          )
          .catch((e) => console.log(e.message));
        records.push({ steamid, ...summary, updatedAt });
      }

      //steam leaves out ids it doesn't know, cache those so they aren't requested again
      const returnedIds = new Set(retrievedPlayers.map((p) => p.steamid));
      for (const id of ids.filter((id) => !returnedIds.has(id))) {
        cacheFailure(summaries, { _id: scopedId(key, id) });
      }

      return records;
    })
    .catch((e) => {
      console.log("failed on player summaries: " + e.message);
      for (const id of ids) {
        cacheFailure(summaries, { _id: scopedId(key, id) });
      }
      //no new records, any stored ones are used instead
      return [];
    });
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
      return requestOwnedGames(key, id)
        .then((gamesList) => {
          if (gamesList?.games === undefined) {
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
      console.log(e.message);
    });
};

module.exports = { getPlayersInfo, retrievePlayerSummaries };
