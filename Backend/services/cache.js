const crypto = require("crypto");

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
//how long to wait before asking steam again after a failed request
const FAILED_RETRY_MS = 60 * 60 * 1000;

//true when a record needs to be requested from steam again
//records without an updatedAt are treated as stale because their age is unknown
//maxAgeMs lets callers that need fresher data (e.g. the player card) shorten the window
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

//saves that a steam request failed, any data already in the record is kept
//a pipeline so a good record keeps its age, only a new record gets a new updatedAt
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
const keyScope = (key) =>
  crypto.createHash("sha256").update(String(key)).digest("hex").slice(0, 24);

//_id for a per-key record about one player
const scopedId = (key, id) => `${keyScope(key)}:${id}`;

module.exports = { isStale, cacheFailure, keyScope, scopedId };
