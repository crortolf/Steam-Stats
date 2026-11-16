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

const insertRecommendation = async (recommendation) => {
  const doc = { ...recommendation, createdAt: new Date() };
  const { insertedId } = await recommendations.insertOne(doc);
  return { _id: insertedId, ...doc };
};

//cursors are "<createdAt ms>_<id>" so posts made in the same millisecond
//still page in a stable order
const encodeCursor = (doc) => `${doc.createdAt.getTime()}_${doc._id}`;

const decodeCursor = (cursor) => {
  if (typeof cursor !== "string") return null;
  const [ms, id] = cursor.split("_");
  if (!/^\d+$/.test(ms) || !mc.ObjectId.isValid(id)) return null;
  return { createdAt: new Date(Number(ms)), _id: new mc.ObjectId(id) };
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

//one page of a feed, newest first. authorId limits it to one user's posts,
//authorSteamIds to posts written from those steam accounts (the friends feed),
//gameTitle to games whose name contains that text (ignoring case). before is
//the cursor from the previous page's nextCursor
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

//deletes a post only if this user wrote it, resolves to whether it did
const deleteRecommendation = async (id, authorId) => {
  if (!mc.ObjectId.isValid(id)) return false;
  const { deletedCount } = await recommendations.deleteOne({
    _id: new mc.ObjectId(id),
    authorId,
  });
  return deletedCount === 1;
};

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
