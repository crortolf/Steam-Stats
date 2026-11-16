const {
  getGamesInfo,
  getOwnedGames,
  searchCachedGames,
} = require("../services/games");
const { retrievePlayerSummaries } = require("../services/players");
const { getIds } = require("../services/friends");
const { spAchievementData } = require("./achievementsController");
const {
  insertRecommendation,
  listRecommendations,
  deleteRecommendation,
  countRecentByAuthor,
} = require("../services/recommendations");
const {
  findClaimableImages,
  attachImages,
  detachImagesFromPost,
  deleteImagesForPost,
} = require("../services/recommendationImages");

const MAX_BODY_LENGTH = 4000;
const MAX_COMMENT_LENGTH = 500;
const MAX_HIGHLIGHTS = 10;
const MAX_POST_IMAGES = 4;
const MAX_ACHIEVEMENT_IMAGES = 2;
const MIN_SCORE = 1;
const MAX_SCORE = 10;
const MAX_GAME_RESULTS = 20;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 30;
//a simple guard against spam
const MAX_POSTS_PER_HOUR = 10;
const HOUR_MS = 60 * 60 * 1000;

//a recommendation as other users see it: never the author's email
const toPublicRecommendation = (doc, viewerId) => ({
  id: String(doc._id),
  author: {
    steamId: doc.author.steamId,
    name: doc.author.name,
    avatar: doc.author.avatar,
  },
  isYours: doc.authorId === viewerId,
  game: doc.game,
  body: doc.body,
  //null when the author didn't give one
  score: doc.score ?? null,
  //posts from before images were supported have none
  images: doc.images ?? [],
  achievements: doc.achievements.map((a) => ({ ...a, images: a.images ?? [] })),
  createdAt: doc.createdAt.toISOString(),
});

//an optional list of uploaded image ids, or null if it isn't one
const imageIdList = (value, max) => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > max) return null;
  return value.every((id) => typeof id === "string") ? value : null;
};

const pageSize = (raw) => {
  const n = Number(raw ?? DEFAULT_PAGE_SIZE);
  return Number.isInteger(n) && n >= 1 && n <= MAX_PAGE_SIZE
    ? n
    : DEFAULT_PAGE_SIZE;
};

const MAX_GAME_SEARCH_LENGTH = 100;

//newest first. scope is "all" for everyone's posts, "mine" for the signed in
//user's own, or "friends" for posts by their steam friends; an optional
//?game= limits it to games whose title contains that text
//the friends scope reads the friend list with the user's own key (cached per
//key), so it only ever uses friends steam lets this user see
const getFeed = async (req, response, { scope }) => {
  const game =
    typeof req.query.game === "string"
      ? req.query.game.trim().slice(0, MAX_GAME_SEARCH_LENGTH)
      : "";
  const authorSteamIds =
    scope === "friends"
      ? await getIds(req.steamApiKey, req.user.steamId)
      : undefined;
  const { items, nextCursor } = await listRecommendations({
    authorId: scope === "mine" ? req.user._id : undefined,
    authorSteamIds,
    gameTitle: game || undefined,
    before: req.query.before,
    limit: pageSize(req.query.limit),
  });
  response.json({
    items: items.map((doc) => toPublicRecommendation(doc, req.user._id)),
    nextCursor,
  });
};

const isAppId = (value) => /^\d{1,10}$/.test(String(value ?? ""));

//a store link like store.steampowered.com/app/620/... or a bare app id
const parseAppId = (text) => {
  const trimmed = text.trim();
  if (isAppId(trimmed)) return trimmed;
  return trimmed.match(/store\.steampowered\.com\/app\/(\d{1,10})/i)?.[1] ?? null;
};

//games to pick from when writing a recommendation: any game can be
//recommended, owned or not. a store link or app id looks that game up;
//otherwise the user's library and games the site already knows are searched
const searchGames = async (req, response) => {
  const query = typeof req.query.q === "string" ? req.query.q.slice(0, 100) : "";

  const appId = parseAppId(query);
  if (appId !== null) {
    const [game] = await getGamesInfo(req.steamApiKey, [appId]);
    return response.json(
      game ? [{ id: game.id, name: game.name, image: game.image }] : [],
    );
  }

  const needle = query.trim().toLowerCase();
  const [owned, known] = await Promise.all([
    getOwnedGames(req.steamApiKey, req.user.steamId).catch(() => []),
    needle ? searchCachedGames(needle, MAX_GAME_RESULTS) : [],
  ]);

  //library first (most played first when there's no search), then other games
  const ownedMatches = (owned ?? [])
    .filter((g) => g.title && g.title.toLowerCase().includes(needle))
    .sort((a, b) => (b.playtime ?? 0) - (a.playtime ?? 0));
  const knownById = new Map(known.map((g) => [String(g.id), g]));
  const results = new Map();
  for (const g of ownedMatches) {
    results.set(String(g.id), {
      id: g.id,
      name: g.title,
      image: knownById.get(String(g.id))?.image ?? null,
      owned: true,
    });
  }
  for (const g of known) {
    if (!results.has(String(g.id))) results.set(String(g.id), { ...g, owned: false });
  }
  response.json([...results.values()].slice(0, MAX_GAME_RESULTS));
};

//the achievements a game has, marked with whether this user has unlocked them
//used to pick which ones to highlight
const getGameAchievements = async (req, response) => {
  const { appId } = req.query;
  if (!isAppId(appId)) {
    return response.status(400).json({ error: "Invalid game." });
  }
  const options = await achievementOptions(
    req.steamApiKey,
    req.user.steamId,
    appId,
  );
  if (options === null) {
    return response.status(404).json({ error: "Game not found." });
  }
  response.json(options.achievements);
};

//game details plus its achievements with this player's unlock state
//null if steam has no record of the game
const achievementOptions = async (key, steamId, appId) => {
  const [[game], playerData] = await Promise.all([
    getGamesInfo(key, [appId]),
    //private or missing stats just mean nothing shows as unlocked
    spAchievementData(key, appId, steamId).catch(() => null),
  ]);
  if (!game) return null;

  const unlocked = new Set(
    (playerData?.achievements ?? [])
      .filter((a) => a.achieved === 1)
      .map((a) => a.aId),
  );
  return {
    game: { id: game.id, name: game.name, image: game.image },
    achievements: (game.achievements ?? []).map((a) => ({
      apiName: a.name,
      name: a.displayName ?? a.name,
      description: a.description ?? "",
      icon: a.icon,
      iconGray: a.icongray,
      unlocked: unlocked.has(a.name),
    })),
  };
};

const createRecommendation = async (req, response) => {
  const { appId, body, achievements, score, images } = req.body ?? {};

  if (!isAppId(appId)) {
    return response.status(400).json({ error: "Choose a game." });
  }
  const text = typeof body === "string" ? body.trim() : "";
  if (text.length === 0) {
    return response
      .status(400)
      .json({ error: "Write something about the game." });
  }
  if (text.length > MAX_BODY_LENGTH) {
    return response.status(400).json({
      error: `Recommendations can be up to ${MAX_BODY_LENGTH} characters.`,
    });
  }

  //optional, a whole number out of ten
  if (
    score !== undefined &&
    score !== null &&
    !(Number.isInteger(score) && score >= MIN_SCORE && score <= MAX_SCORE)
  ) {
    return response.status(400).json({
      error: `Scores are whole numbers from ${MIN_SCORE} to ${MAX_SCORE}.`,
    });
  }

  const highlights = Array.isArray(achievements) ? achievements : [];
  if (highlights.length > MAX_HIGHLIGHTS) {
    return response.status(400).json({
      error: `You can highlight up to ${MAX_HIGHLIGHTS} achievements.`,
    });
  }
  const seen = new Set();
  for (const h of highlights) {
    const comment = h?.comment ?? "";
    if (
      typeof h?.apiName !== "string" ||
      seen.has(h.apiName) ||
      typeof comment !== "string" ||
      comment.trim().length > MAX_COMMENT_LENGTH
    ) {
      return response.status(400).json({
        error: `Each highlighted achievement can have a comment of up to ${MAX_COMMENT_LENGTH} characters.`,
      });
    }
    if (imageIdList(h.images, MAX_ACHIEVEMENT_IMAGES) === null) {
      return response.status(400).json({
        error: `Each highlighted achievement can have up to ${MAX_ACHIEVEMENT_IMAGES} images.`,
      });
    }
    seen.add(h.apiName);
  }

  const postImageIds = imageIdList(images, MAX_POST_IMAGES);
  if (postImageIds === null) {
    return response.status(400).json({
      error: `A recommendation can have up to ${MAX_POST_IMAGES} images.`,
    });
  }
  //every image must be one this user uploaded and hasn't used in a post yet
  const allImageIds = [
    ...postImageIds,
    ...highlights.flatMap((h) => imageIdList(h.images, MAX_ACHIEVEMENT_IMAGES)),
  ];
  if (new Set(allImageIds).size !== allImageIds.length) {
    return response
      .status(400)
      .json({ error: "Each image can only be used once." });
  }
  const claimable = await findClaimableImages(req.user._id, allImageIds);
  if (claimable === null) {
    return response.status(400).json({
      error: "One of your images couldn't be found. Try uploading it again.",
    });
  }
  const imageById = new Map(claimable.map((img) => [img.id, img]));
  const imagesFor = (ids) => ids.map((id) => imageById.get(id));

  if (
    (await countRecentByAuthor(req.user._id, HOUR_MS)) >= MAX_POSTS_PER_HOUR
  ) {
    return response.status(429).json({
      error: "You've posted a lot recently. Please try again later.",
    });
  }

  const [options, [authorSummary]] = await Promise.all([
    achievementOptions(req.steamApiKey, req.user.steamId, appId),
    retrievePlayerSummaries(req.steamApiKey, [req.user.steamId]),
  ]);
  if (options === null) {
    return response
      .status(502)
      .json({ error: "Steam couldn't find that game. Please try again." });
  }

  //names and icons come from steam, not from the request
  const byApiName = new Map(options.achievements.map((a) => [a.apiName, a]));
  const highlighted = [];
  for (const h of highlights) {
    const a = byApiName.get(h.apiName);
    if (a === undefined) {
      return response
        .status(400)
        .json({ error: "That achievement isn't part of this game." });
    }
    highlighted.push({
      ...a,
      comment: (h.comment ?? "").trim(),
      images: imagesFor(imageIdList(h.images, MAX_ACHIEVEMENT_IMAGES)),
    });
  }

  const doc = await insertRecommendation({
    authorId: req.user._id,
    //a snapshot, so the post still shows who wrote it if they change accounts
    author: {
      steamId: req.user.steamId,
      name: authorSummary?.personaname ?? "Steam user",
      avatar: authorSummary?.avatarfull ?? null,
    },
    game: options.game,
    body: text,
    score: score ?? null,
    images: imagesFor(postImageIds),
    achievements: highlighted,
  });

  //claim the images for this post; if another request got to one first,
  //remove the post and release the images it did claim
  if (!(await attachImages(req.user._id, allImageIds, doc._id))) {
    await deleteRecommendation(String(doc._id), req.user._id);
    await detachImagesFromPost(doc._id);
    return response.status(409).json({
      error: "One of your images was already used in another post. Remove it and try again.",
    });
  }
  response.status(201).json(toPublicRecommendation(doc, req.user._id));
};

const removeRecommendation = async (req, response) => {
  const deleted = await deleteRecommendation(req.params.id, req.user._id);
  if (!deleted) {
    return response.status(404).json({ error: "Recommendation not found." });
  }
  await deleteImagesForPost(req.params.id);
  response.status(204).end();
};

module.exports = {
  getFeed,
  searchGames,
  getGameAchievements,
  createRecommendation,
  removeRecommendation,
};
