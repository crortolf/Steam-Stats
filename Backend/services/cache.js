const crypto = require("crypto");

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
//how long to wait before asking steam again after a failed request
const FAILED_RETRY_MS = 60 * 60 * 1000;

/**
 * Decides whether a cached record needs to be requested from steam again.
 *
 * A record that recently failed waits an hour (or maxAgeMs, if that's shorter)
 * before steam is retried. Otherwise it's stale once updatedAt is older than
 * maxAgeMs. Records without an updatedAt are stale because their age is unknown.
 *
 * @param {object|null} record - The cached record, or null if there isn't one.
 * @param {number} [maxAgeMs] - How old the data may be, in milliseconds.
 *   Defaults to a day; callers that need fresher data (e.g. the player card) pass less.
 * @returns {boolean} true if steam should be asked again.
 */
const isStale = (record, maxAgeMs = CACHE_MAX_AGE_MS) => {
  if (record === null) return true;
  if (record.failedAt) {
    return record.failedAt < new Date(Date.now() - Math.min(FAILED_RETRY_MS, maxAgeMs));
  }
  return (
    !record.updatedAt ||
    record.updatedAt < new Date(Date.now() - maxAgeMs)
  );
};

/**
 * Records that a steam request failed, so isStale waits before trying again.
 * Any data already in the record is kept.
 *
 * Upserts failedAt = now. It's an update pipeline, so an existing record keeps
 * its updatedAt and only a brand new record gets one. Database errors are
 * logged, not thrown.
 *
 * @param {import("mongodb").Collection} collection - The cache collection.
 * @param {object} filter - Finds the record, ex: { _id }.
 * @returns {Promise<import("mongodb").UpdateResult|undefined>} Mongo's update
 *   result, or undefined if the write failed.
 */
const cacheFailure = (collection, filter) => {
  return collection
    .updateOne(
      filter,
      [
        {
          $set: {
            failedAt: new Date(),
            updatedAt: { $ifNull: ["$updatedAt", new Date()] },
          },
        },
      ],
      { upsert: true },
    )
    .catch((e) => console.log(e.message));
};

//steam answers each request with what the api key's owner is allowed to see, so
//data that privacy settings can hide (friend lists, libraries, recently played,
//achievements, profile details) is cached separately for each key. that way a
//user is only ever shown what their own key gets from steam, never friends-only
//or private data that someone else's key fetched. data that's the same for
//everyone (game info, news, global percentages) stays shared
//the key is hashed so cached records don't hold users' api keys

/**
 * Turns an api key into the label its cached records are stored under.
 *
 * Takes the first 24 hex characters of the key's SHA-256 hash, so the same key
 * always gets the same label but the key can't be read back from it.
 *
 * @param {string} key - A steam api key.
 * @returns {string} 24 hex characters.
 */
const keyScope = (key) =>
  crypto.createHash("sha256").update(String(key)).digest("hex").slice(0, 24);

/**
 * Makes the _id for a per-key cached record about one player.
 *
 * @param {string} key - The steam api key the data was fetched with.
 * @param {string} id - The player's steam id.
 * @returns {string} "<keyScope(key)>:<id>"
 */
const scopedId = (key, id) => `${keyScope(key)}:${id}`;

module.exports = { isStale, cacheFailure, keyScope, scopedId };
