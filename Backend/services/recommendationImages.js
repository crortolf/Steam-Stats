const mc = require("mongodb");

const mongo = new mc.MongoClient("mongodb://localhost:27017", {
  serverApi: {
    version: mc.ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}).db("Steam-Stats");

//each image is its own document, so loading the feed never loads image bytes
//{ _id, ownerId, postId, data, contentType, width, height, size, createdAt, expiresAt }
const images = mongo.collection("RecommendationImages");

//uploads that never get attached to a post are removed after this long
const UNATTACHED_TTL_MS = 24 * 60 * 60 * 1000;

//mongo removes documents once expiresAt passes; attached images have no
//expiresAt, so they're kept
images
  .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  .catch((e) => console.log(e.message));
images.createIndex({ postId: 1 }).catch((e) => console.log(e.message));
images
  .createIndex({ ownerId: 1, createdAt: -1 })
  .catch((e) => console.log(e.message));

const toObjectIds = (ids) =>
  ids.every((id) => typeof id === "string" && mc.ObjectId.isValid(id))
    ? ids.map((id) => new mc.ObjectId(id))
    : null;

//stores a processed image as not yet attached to any post
const saveImage = async (ownerId, { data, contentType, width, height }) => {
  const now = new Date();
  const doc = {
    ownerId,
    postId: null,
    data: new mc.Binary(data),
    contentType,
    width,
    height,
    size: data.length,
    createdAt: now,
    expiresAt: new Date(now.getTime() + UNATTACHED_TTL_MS),
  };
  const { insertedId } = await images.insertOne(doc);
  return { id: String(insertedId), width, height };
};

//the size details of images this user uploaded and hasn't attached yet, in
//the order asked for; null if any id isn't one of those
const findClaimableImages = async (ownerId, ids) => {
  if (ids.length === 0) return [];
  const objectIds = toObjectIds(ids);
  if (objectIds === null) return null;
  const found = await images
    .find(
      { _id: { $in: objectIds }, ownerId, postId: null },
      { projection: { width: 1, height: 1 } },
    )
    .toArray();
  if (found.length !== ids.length) return null;
  const byId = new Map(found.map((d) => [String(d._id), d]));
  return ids.map((id) => ({
    id,
    width: byId.get(id).width,
    height: byId.get(id).height,
  }));
};

//attaches images to a post so they're kept and shown with it
const attachImages = async (ownerId, ids, postId) => {
  if (ids.length === 0) return true;
  const { modifiedCount } = await images.updateMany(
    { _id: { $in: toObjectIds(ids) }, ownerId, postId: null },
    { $set: { postId }, $unset: { expiresAt: "" } },
  );
  return modifiedCount === ids.length;
};

const getImage = (id) =>
  mc.ObjectId.isValid(id) ? images.findOne({ _id: new mc.ObjectId(id) }) : null;

//removes an upload its owner decided not to use; attached images stay
const deleteUnattachedImage = async (id, ownerId) => {
  if (!mc.ObjectId.isValid(id)) return false;
  const { deletedCount } = await images.deleteOne({
    _id: new mc.ObjectId(id),
    ownerId,
    postId: null,
  });
  return deletedCount === 1;
};

//undoes attachImages, so the uploads can be used in another try at posting
const detachImagesFromPost = (postId) =>
  images.updateMany(
    { postId: new mc.ObjectId(String(postId)) },
    {
      $set: {
        postId: null,
        expiresAt: new Date(Date.now() + UNATTACHED_TTL_MS),
      },
    },
  );

const deleteImagesForPost = (postId) =>
  images.deleteMany({ postId: new mc.ObjectId(String(postId)) });

const countRecentUploads = (ownerId, sinceMs) =>
  images.countDocuments({
    ownerId,
    createdAt: { $gt: new Date(Date.now() - sinceMs) },
  });

module.exports = {
  saveImage,
  findClaimableImages,
  attachImages,
  getImage,
  deleteUnattachedImage,
  detachImagesFromPost,
  deleteImagesForPost,
  countRecentUploads,
};
