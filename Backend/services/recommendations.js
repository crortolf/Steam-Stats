const mc = require("mongodb");

const mongo = new mc.MongoClient("mongodb://localhost:27017", {
  serverApi: {
    version: mc.ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}).db("Steam-Stats");

const recommendations = mongo.collection("Recommendations");

//the feeds read newest first, either everyone's or one author's
recommendations
  .createIndex({ createdAt: -1, _id: -1 })
  .catch((e) => console.log(e.message));
recommendations
  .createIndex({ authorId: 1, createdAt: -1, _id: -1 })
  .catch((e) => console.log(e.message));
//the friends feed matches posts by the authors' steam ids
recommendations
  .createIndex({ "author.steamId": 1, createdAt: -1, _id: -1 })
  .catch((e) => console.log(e.message));

/**
 * Saves a new recommendation.
 *
 * Adds createdAt (now) and inserts it. The caller has already checked and
 * built every field.
 *
 * @param {object} recommendation - The post: { authorId, author, game, body,
 *   score, images, achievements }.
 * @returns {Promise<object>} The saved post, with its new _id and createdAt.
 */
const insertRecommendation = async (recommendation) => {
  const doc = { ...recommendation, createdAt: new Date() };
  const { insertedId } = await recommendations.insertOne(doc);
  return { _id: insertedId, ...doc };
};

/**
 * Makes the cursor that marks where the next page of a feed starts.
 *
 * Cursors are "<createdAt ms>_<id>", so posts made in the same millisecond
 * still page in a stable order.
 *
 * @param {{createdAt: Date, _id: import("mongodb").ObjectId}} doc - The last post on the page.
 * @returns {string} The cursor, ex: "1763251200000_6738f0c2a1b2c3d4e5f60718".
 */
const encodeCursor = (doc) => `${doc.createdAt.getTime()}_${doc._id}`;

/**
 * Reads a cursor made by encodeCursor. Cursors come from the browser, so
 * anything malformed is treated as "no cursor".
 *
 * Splits on "_" and checks both halves before converting them.
 *
 * @param {unknown} cursor - The ?before= value from the request.
 * @returns {{createdAt: Date, _id: import("mongodb").ObjectId}|null} Where the
 *   previous page ended, or null if cursor is missing or invalid.
 */
const decodeCursor = (cursor) => {
  if (typeof cursor !== "string") return null;
  const [ms, id] = cursor.split("_");
  if (!/^\d+$/.test(ms) || !mc.ObjectId.isValid(id)) return null;
  return { createdAt: new Date(Number(ms)), _id: new mc.ObjectId(id) };
};

/**
 * Makes text safe to use inside a regular expression.
 *
 * Puts a backslash before every character that has a special meaning in a regex.
 *
 * @param {string} text - Text that should be matched literally, ex: "C++".
 * @returns {string} The escaped text, ex: "C\\+\\+".
 */
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Gets one page of a recommendations feed, newest first.
 *
 * Builds a mongo filter from the options, adds "older than the cursor" when
 * there is one, and fetches limit + 1 posts sorted by createdAt then _id. The
 * extra post only shows whether another page exists; it's dropped, and the
 * last post kept becomes the next cursor.
 *
 * @param {object} options
 * @param {string} [options.authorId] - Only this user's posts (their email). For "mine".
 * @param {string[]} [options.authorSteamIds] - Only posts written from these
 *   steam accounts. For the friends feed; an empty list returns an empty page.
 * @param {string} [options.gameTitle] - Only games whose name contains this text, ignoring case.
 * @param {string} [options.before] - The nextCursor from the previous page.
 * @param {number} options.limit - Posts per page.
 * @returns {Promise<{items: object[], nextCursor: string|null}>} The posts, and
 *   the cursor for the next page or null on the last page.
 */
const listRecommendations = async ({
  authorId,
  authorSteamIds,
  gameTitle,
  before,
  limit,
}) => {
  //no friends (or a private friend list) means nothing to show
  if (authorSteamIds !== undefined && authorSteamIds.length === 0) {
    return { items: [], nextCursor: null };
  }

  const filter = {};
  if (authorId !== undefined) filter.authorId = authorId;
  if (authorSteamIds !== undefined) {
    filter["author.steamId"] = { $in: authorSteamIds };
  }
  if (gameTitle) {
    filter["game.name"] = { $regex: escapeRegex(gameTitle), $options: "i" };
  }

  const after = decodeCursor(before);
  if (after !== null) {
    filter.$or = [
      { createdAt: { $lt: after.createdAt } },
      { createdAt: after.createdAt, _id: { $lt: after._id } },
    ];
  }

  //one extra tells us whether there's another page
  const docs = await recommendations
    .find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .toArray();

  const page = docs.slice(0, limit);
  return {
    items: page,
    nextCursor: docs.length > limit ? encodeCursor(page[page.length - 1]) : null,
  };
};

/**
 * Deletes a post, but only if this user wrote it.
 *
 * Matches on both the post id and the author in one delete, so nobody can
 * remove another user's post.
 *
 * @param {string} id - The post id.
 * @param {string} authorId - The signed in user's account id (their email).
 * @returns {Promise<boolean>} true if it was deleted; false if the id is
 *   invalid, the post doesn't exist, or someone else wrote it.
 */
const deleteRecommendation = async (id, authorId) => {
  if (!mc.ObjectId.isValid(id)) return false;
  const { deletedCount } = await recommendations.deleteOne({
    _id: new mc.ObjectId(id),
    authorId,
  });
  return deletedCount === 1;
};

/**
 * Counts how many posts a user has made recently, for the posting rate limit.
 *
 * @param {string} authorId - The user's account id (their email).
 * @param {number} sinceMs - How far back to count, in milliseconds.
 * @returns {Promise<number>} The number of posts created in that window.
 */
const countRecentByAuthor = (authorId, sinceMs) =>
  recommendations.countDocuments({
    authorId,
    createdAt: { $gt: new Date(Date.now() - sinceMs) },
  });

module.exports = {
  insertRecommendation,
  listRecommendations,
  deleteRecommendation,
  countRecentByAuthor,
};
