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

/**
 * Gets several players' names, avatars and play time per game, from the cache
 * when it's fresh and from steam otherwise.
 *
 * Looks each player up in the Players collection in parallel. Missing or stale
 * records (see isStale) are fetched with retrievePlayerInfo and saved; if that
 * fails, the failure is recorded and the stored record is used instead.
 *
 * Records are cached per api key (see keyScope in cache.js), so a library read
 * with one user's key isn't shown to another user.
 *
 * @param {string} key - The signed in user's steam api key.
 * @param {string[]} ids - 64-bit steam ids of the players.
 * @returns {Promise<(object|null|undefined)[]>|undefined} One entry per id, in
 *   the same order: { id, name, image, games } where games maps each app id to
 *   { playtime, lastPlayed }, or null if steam has nothing for that player
 *   (undefined if the database read failed). Returns undefined instead of a
 *   promise if any id is undefined.
 */
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

/**
 * Gets the player id back out of a per-key cache _id. The reverse of scopedId in cache.js.
 *
 * Keeps everything after the first ":".
 *
 * @param {string} _id - A cache _id shaped "<key scope>:<steam id>".
 * @returns {string} The steam id.
 */
const unscopedId = (_id) => _id.slice(_id.indexOf(":") + 1);

/**
 * Gets steam's profile summary (name, avatar, status, ...) for several players,
 * reading the cache before asking steam.
 *
 * Reads all cached summaries for these ids in one query, works out which are
 * missing or stale (see isStale), and asks steam for those in batches of up to
 * 100 with requestPlayerSummaries. Fresh results replace the cached ones, then
 * the summaries are returned in the order the ids were given.
 *
 * Summaries are cached per api key (see keyScope in cache.js): steam hides more
 * of a profile from strangers than from friends, so a summary read with one
 * user's key is never shown to another user.
 *
 * @param {string} key - The signed in user's steam api key.
 * @param {string[]} ids - 64-bit steam ids of the players.
 * @param {object} [options]
 * @param {number} [options.maxAgeMs] - How old a cached summary may be before
 *   steam is asked again. Defaults to a day.
 * @param {boolean} [options.withUpdatedAt=false] - Keep each summary's
 *   updatedAt (when it was fetched from steam).
 * @returns {Promise<object[]>} { steamid, ...steam's summary fields } for each
 *   player that has a summary, in the order of ids. Players without one are left out.
 */
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

/**
 * Asks steam for one batch of profile summaries and caches them under this key.
 *
 * Calls steam's GetPlayerSummaries with all the ids at once. Each returned
 * summary is saved in the background with a new updatedAt. Ids steam leaves
 * out (unknown accounts) are recorded as failures so they aren't asked for
 * again for a while. If the whole request fails, every id is recorded as a
 * failure and nothing is returned, so the caller falls back on stored data.
 *
 * @param {string} key - The signed in user's steam api key.
 * @param {string[]} ids - Up to 100 steam ids (steam's limit per request).
 * @param {import("mongodb").Collection} summaries - The PlayerSummaries collection.
 * @returns {Promise<object[]>} { steamid, ...summary, updatedAt } for each player
 *   steam returned; empty if the request failed. Never rejects.
 */
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

/**
 * Builds one player's name, avatar and play time per game from steam. Always
 * steam requests; getPlayersInfo caches the result.
 *
 * Gets the player's summary from GetPlayerSummaries, then their library with
 * requestOwnedGames, and turns the library into a map from app id to play time.
 * Errors are written to retreivePlayers.txt and logged.
 *
 * @param {string} key - The signed in user's steam api key.
 * @param {string} id - The player's 64-bit steam id.
 * @returns {Promise<object|undefined>} { id, name, image, games } where games
 *   maps each app id to { playtime (minutes), lastPlayed (unix seconds) }:
 *   - name, image and games are null if steam doesn't know the player
 *   - games is an empty array if the library is hidden
 *   - undefined if a request failed
 */
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
