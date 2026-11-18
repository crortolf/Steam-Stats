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

/**
 * Turns image id strings into mongo ObjectIds, all or nothing.
 *
 * @param {string[]} ids - Image ids as sent by the browser.
 * @returns {import("mongodb").ObjectId[]|null} The ObjectIds in the same order,
 *   or null if any entry isn't a valid id string.
 */
const toObjectIds = (ids) =>
  ids.every((id) => typeof id === "string" && mc.ObjectId.isValid(id))
    ? ids.map((id) => new mc.ObjectId(id))
    : null;

/**
 * Stores a processed upload as not yet attached to any post.
 *
 * Inserts the bytes and details as one document with postId null and an
 * expiresAt a day away, so mongo deletes it if it's never used in a post.
 *
 * @param {string} ownerId - The uploader's account id (their email).
 * @param {object} image - The processed image.
 * @param {Buffer} image.data - The image bytes.
 * @param {string} image.contentType - Its media type, ex: "image/webp".
 * @param {number} image.width - Width in pixels.
 * @param {number} image.height - Height in pixels.
 * @returns {Promise<{id: string, width: number, height: number}>} The new image's id and size.
 */
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

/**
 * Checks that every image id is an upload by this user that isn't in a post
 * yet, and gets their sizes.
 *
 * Finds all matching images (same owner, postId null) in one query, fetching
 * only their sizes. If fewer are found than asked for, at least one id is
 * someone else's, already used, expired or made up.
 *
 * @param {string} ownerId - The user's account id (their email).
 * @param {string[]} ids - Image ids the user wants to use.
 * @returns {Promise<{id: string, width: number, height: number}[]|null>} Each
 *   image's id and size in the order asked for; empty if ids is empty; null if
 *   any id can't be claimed.
 */
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

/**
 * Attaches uploads to a post so they're kept and shown with it.
 *
 * In one update, sets postId and removes expiresAt on each image that still
 * belongs to this user and isn't in a post. Checking postId: null in the same
 * update means two posts racing for one image can't both get it.
 *
 * @param {string} ownerId - The user's account id (their email).
 * @param {string[]} ids - Image ids, already checked with findClaimableImages.
 * @param {import("mongodb").ObjectId} postId - The post to attach them to.
 * @returns {Promise<boolean>} true if every image was attached; false if
 *   another request claimed one first.
 */
const attachImages = async (ownerId, ids, postId) => {
  if (ids.length === 0) return true;
  const { modifiedCount } = await images.updateMany(
    { _id: { $in: toObjectIds(ids) }, ownerId, postId: null },
    { $set: { postId }, $unset: { expiresAt: "" } },
  );
  return modifiedCount === ids.length;
};

/**
 * Loads one image, including its bytes.
 *
 * @param {string} id - The image id.
 * @returns {Promise<object|null>|null} The whole image document ({ _id,
 *   ownerId, postId, data, contentType, width, height, ... }), or null if it
 *   doesn't exist. Plain null (not a promise) if id isn't a valid id.
 */
const getImage = (id) =>
  mc.ObjectId.isValid(id) ? images.findOne({ _id: new mc.ObjectId(id) }) : null;

/**
 * Removes an upload its owner decided not to use. Images in a post are never removed here.
 *
 * Deletes the image only if it belongs to this user and has no postId.
 *
 * @param {string} id - The image id.
 * @param {string} ownerId - The user's account id (their email).
 * @returns {Promise<boolean>} true if it was deleted; false if the id is
 *   invalid, isn't theirs, or is already in a post.
 */
const deleteUnattachedImage = async (id, ownerId) => {
  if (!mc.ObjectId.isValid(id)) return false;
  const { deletedCount } = await images.deleteOne({
    _id: new mc.ObjectId(id),
    ownerId,
    postId: null,
  });
  return deletedCount === 1;
};

/**
 * Undoes attachImages, so the uploads can be used in another try at posting.
 *
 * Sets postId back to null on every image in the post and gives each a new
 * expiresAt a day away.
 *
 * @param {import("mongodb").ObjectId|string} postId - The post whose images to release.
 * @returns {Promise<import("mongodb").UpdateResult>} Mongo's update result.
 */
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

/**
 * Deletes every image in a post, used when the post itself is deleted.
 *
 * @param {import("mongodb").ObjectId|string} postId - The deleted post's id.
 *   Must be a valid id; an invalid one throws.
 * @returns {Promise<import("mongodb").DeleteResult>} Mongo's delete result.
 */
const deleteImagesForPost = (postId) =>
  images.deleteMany({ postId: new mc.ObjectId(String(postId)) });

/**
 * Counts how many images a user has uploaded recently, for the upload rate limit.
 *
 * Counts this user's images created after now minus sinceMs, whether or not
 * they're in a post yet.
 *
 * @param {string} ownerId - The user's account id (their email).
 * @param {number} sinceMs - How far back to count, in milliseconds.
 * @returns {Promise<number>} The number of uploads in that window.
 */
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
