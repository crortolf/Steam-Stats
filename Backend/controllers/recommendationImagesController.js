const multer = require("multer");
const sharp = require("sharp");
const {
  saveImage,
  getImage,
  deleteUnattachedImage,
  countRecentUploads,
} = require("../services/recommendationImages");

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
//images are shrunk to fit inside this many pixels on each side
const MAX_DIMENSION = 1600;
//refuses huge images (e.g. a tiny file that decodes to billions of pixels)
const MAX_INPUT_PIXELS = 40_000_000;
const WEBP_QUALITY = 82;
//checked against what the file actually contains, never its name or type
//svg is never allowed: it can contain scripts
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "gif"]);
const MAX_UPLOADS_PER_HOUR = 60;
const HOUR_MS = 60 * 60 * 1000;

//multer reads the multipart upload into memory: one file, nothing else
const receiveFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 0, parts: 1 },
}).single("image");

/**
 * Middleware that stops a user from uploading more than 60 images an hour.
 *
 * Runs before the upload is read, so a user over the limit can't keep the
 * server busy receiving files.
 *
 * @param {import("express").Request} req - Needs req.user from requireUser.
 * @param {import("express").Response} response - Answers 429 { error } when over the limit.
 * @param {Function} next - Called when the upload may continue.
 * @returns {Promise<void>}
 */
const limitUploads = async (req, response, next) => {
  if (
    (await countRecentUploads(req.user._id, HOUR_MS)) >= MAX_UPLOADS_PER_HOUR
  ) {
    return response.status(429).json({
      error: "You've uploaded a lot of images recently. Please try again later.",
    });
  }
  next();
};

/**
 * Middleware that reads the uploaded file into memory, and turns multer's
 * errors into messages for the user.
 *
 * Accepts exactly one file in the "image" field, up to 5 MB, and nothing else.
 *
 * @param {import("express").Request} req - A multipart upload. Sets req.file
 *   ({ buffer, ... }) for the handler after it.
 * @param {import("express").Response} response - Answers 413 { error } if the
 *   file is too big, 400 { error } for anything other than one file.
 * @param {Function} next - Called when the file has been read, or with any
 *   other error.
 * @returns {void}
 */
const receiveUpload = (req, response, next) =>
  receiveFile(req, response, (error) => {
    if (error instanceof multer.MulterError) {
      return error.code === "LIMIT_FILE_SIZE"
        ? response.status(413).json({
            error: `Images can be up to ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
          })
        : response.status(400).json({ error: "Upload one image at a time." });
    }
    if (error) return next(error);
    next();
  });

/**
 * Checks that a file really is an allowed image and makes a clean copy of it.
 *
 * Reads the file's actual format with sharp (never trusting its name or type)
 * and refuses anything but JPEG, PNG, WebP or GIF, and anything that decodes
 * to too many pixels. Then re-encodes it: fixes its rotation, shrinks it to fit
 * 1600×1600, converts it to WebP (keeping animations), and drops all metadata,
 * since photos can carry the GPS location they were taken at.
 *
 * @param {Buffer} buffer - The uploaded file's bytes.
 * @returns {Promise<{data: Buffer, contentType: "image/webp", width: number,
 *   height: number}|null>} The processed image (height is one frame's height
 *   for animations), or null if the file isn't a usable image.
 */
const processImage = async (buffer) => {
  try {
    const metadata = await sharp(buffer, {
      limitInputPixels: MAX_INPUT_PIXELS,
    }).metadata();
    if (!ALLOWED_FORMATS.has(metadata.format)) return null;

    //keep gif/webp animations moving
    const animated = (metadata.pages ?? 1) > 1;
    const { data, info } = await sharp(buffer, {
      limitInputPixels: MAX_INPUT_PIXELS,
      animated,
    })
      //applies the camera's orientation flag before that flag is dropped
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      //sharp writes no metadata unless asked to, so exif/gps is removed here
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });

    return {
      data,
      contentType: "image/webp",
      width: info.width,
      //for animations height covers every frame stacked, pageHeight is one
      height: info.pageHeight ?? info.height,
    };
  } catch (error) {
    console.log("image rejected: " + error.message);
    return null;
  }
};

/**
 * POST /recommendations/images. Stores one uploaded image for use in a post.
 *
 * Processes the file with processImage and saves it as not yet attached to a
 * post; it's deleted after a day if it never is.
 *
 * @param {import("express").Request} req - Needs req.file from receiveUpload
 *   and req.user from requireUser.
 * @param {import("express").Response} response - 201 { id, width, height };
 *   400 { error } if there's no file or it isn't a supported image.
 * @returns {Promise<void>}
 */
const uploadImage = async (req, response) => {
  if (!req.file) {
    return response.status(400).json({ error: "Choose an image to upload." });
  }
  const processed = await processImage(req.file.buffer);
  if (processed === null) {
    return response.status(400).json({
      error: "That file isn't a supported image. Use PNG, JPEG, WebP or GIF.",
    });
  }
  response.status(201).json(await saveImage(req.user._id, processed));
};

/**
 * GET /recommendations/images/:id. Sends an image's bytes.
 *
 * Images in a post are shown to any signed in user; uploads not in a post yet
 * only to whoever uploaded them. Headers make browsers treat the file strictly
 * as an image, and let them cache it for a year since it never changes.
 *
 * @param {import("express").Request} req - req.params.id: the image id. Needs req.user.
 * @param {import("express").Response} response - 200 with the WebP bytes;
 *   404 { error } if it doesn't exist or the user can't see it.
 * @returns {Promise<void>}
 */
const serveImage = async (req, response) => {
  const image = await getImage(req.params.id);
  //an upload that isn't in a post yet is only shown to whoever uploaded it
  if (
    image === null ||
    (image.postId === null && image.ownerId !== req.user._id)
  ) {
    return response.status(404).json({ error: "Image not found." });
  }
  response.set({
    "Content-Type": image.contentType,
    //browsers must treat it as the image it says it is, nothing else
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'",
    "Content-Disposition": 'inline; filename="image.webp"',
    //an image never changes once uploaded
    "Cache-Control": "private, max-age=31536000, immutable",
  });
  response.send(Buffer.from(image.data.buffer));
};

/**
 * DELETE /recommendations/images/:id. Removes an upload the user decided not to use.
 *
 * Only works for the user's own uploads that aren't in a post yet.
 *
 * @param {import("express").Request} req - req.params.id: the image id. Needs req.user.
 * @param {import("express").Response} response - 204 when removed; 404 { error }
 *   if it doesn't exist, isn't theirs, or is already in a post.
 * @returns {Promise<void>}
 */
const removeImage = async (req, response) => {
  const deleted = await deleteUnattachedImage(req.params.id, req.user._id);
  if (!deleted) {
    return response.status(404).json({ error: "Image not found." });
  }
  response.status(204).end();
};

module.exports = {
  limitUploads,
  receiveUpload,
  processImage,
  uploadImage,
  serveImage,
  removeImage,
};
