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

//checked before the upload is read, so a user over the limit can't keep
//the server busy receiving files
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

//runs multer and turns its errors into messages for the user
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

//checks the file really is an allowed image, then re-encodes it: fixes its
//rotation, shrinks it, converts it to webp and drops all metadata (photos can
//carry the gps location they were taken at). null if it isn't a usable image
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
