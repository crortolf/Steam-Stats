//factories rather than automocks, so the real services (and their database
//connections) are never loaded
jest.mock("../services/games", () => ({
  getGamesInfo: jest.fn(),
  getOwnedGames: jest.fn(),
  searchCachedGames: jest.fn(),
}));
jest.mock("../services/players", () => ({ retrievePlayerSummaries: jest.fn() }));
jest.mock("../services/friends", () => ({ getIds: jest.fn() }));
jest.mock("../controllers/achievementsController", () => ({ spAchievementData: jest.fn() }));
jest.mock("../services/recommendations", () => ({
  insertRecommendation: jest.fn(),
  listRecommendations: jest.fn(),
  deleteRecommendation: jest.fn(),
  countRecentByAuthor: jest.fn(),
}));
jest.mock("../services/recommendationImages", () => ({
  findClaimableImages: jest.fn(),
  attachImages: jest.fn(),
  detachImagesFromPost: jest.fn(),
  deleteImagesForPost: jest.fn(),
}));

const games = require("../services/games");
const players = require("../services/players");
const friends = require("../services/friends");
const { spAchievementData } = require("../controllers/achievementsController");
const recs = require("../services/recommendations");
const images = require("../services/recommendationImages");
const {
  getFeed,
  searchGames,
  createRecommendation,
  removeRecommendation,
} = require("../controllers/recommendationsController");

const user = { _id: "me@example.com", steamId: "76561197960435530" };

const mockResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.end = jest.fn(() => res);
  return res;
};

const request = (overrides = {}) => ({
  user,
  steamApiKey: "key",
  query: {},
  params: {},
  body: {},
  ...overrides,
});

const game = {
  id: 620,
  name: "Portal 2",
  image: "portal2.jpg",
  achievements: [{ name: "ACH_WAKE_UP", displayName: "Wake Up Call", icon: "a.jpg", icongray: "b.jpg" }],
};

//a stored post shaped like what insertRecommendation returns
const storedPost = (fields) => ({
  _id: "post-1",
  authorId: user._id,
  author: { steamId: user.steamId, name: "Me", avatar: null },
  game: { id: 620, name: "Portal 2", image: "portal2.jpg" },
  body: "Great game",
  score: null,
  images: [],
  achievements: [],
  createdAt: new Date("2026-01-01T00:00:00Z"),
  ...fields,
});

describe("createRecommendation", () => {
  //the happy path for each service, tests override what they need
  beforeEach(() => {
    images.findClaimableImages.mockResolvedValue([]);
    images.attachImages.mockResolvedValue(true);
    recs.countRecentByAuthor.mockResolvedValue(0);
    games.getGamesInfo.mockResolvedValue([game]);
    spAchievementData.mockResolvedValue({ achievements: [{ aId: "ACH_WAKE_UP", achieved: 1 }] });
    players.retrievePlayerSummaries.mockResolvedValue([{ personaname: "Me", avatarfull: "me.jpg" }]);
    recs.insertRecommendation.mockImplementation(async (doc) => storedPost(doc));
  });

  const create = async (body) => {
    const res = mockResponse();
    await createRecommendation(request({ body }), res);
    return res;
  };

  const expectError = (res, status, message) => {
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining(message) });
    expect(recs.insertRecommendation).not.toHaveBeenCalled();
  };

  describe("validation", () => {
    it("needs a game", async () => {
      expectError(await create({ appId: "abc", body: "hi" }), 400, "Choose a game");
    });

    it("needs a body", async () => {
      expectError(await create({ appId: "620", body: "   " }), 400, "Write something");
    });

    it("limits the body length", async () => {
      expectError(await create({ appId: "620", body: "x".repeat(4001) }), 400, "4000");
    });

    it.each([0, 11, 5.5, "7"])("rejects a score of %p", async (score) => {
      expectError(await create({ appId: "620", body: "hi", score }), 400, "Scores");
    });

    it("rejects the same achievement highlighted twice", async () => {
      const achievements = [{ apiName: "ACH_WAKE_UP" }, { apiName: "ACH_WAKE_UP" }];
      expectError(await create({ appId: "620", body: "hi", achievements }), 400, "comment");
    });

    it("rejects more than 4 post images", async () => {
      const res = await create({ appId: "620", body: "hi", images: ["a", "b", "c", "d", "e"] });
      expectError(res, 400, "up to 4 images");
    });

    it("rejects an image used twice", async () => {
      const res = await create({
        appId: "620",
        body: "hi",
        images: ["a"],
        achievements: [{ apiName: "ACH_WAKE_UP", images: ["a"] }],
      });
      expectError(res, 400, "only be used once");
    });

    it("rejects images the user can't claim", async () => {
      images.findClaimableImages.mockResolvedValue(null);
      expectError(await create({ appId: "620", body: "hi", images: ["a"] }), 400, "couldn't be found");
    });

    it("rejects an achievement that isn't part of the game", async () => {
      const res = await create({ appId: "620", body: "hi", achievements: [{ apiName: "FAKE" }] });
      expectError(res, 400, "isn't part of this game");
    });
  });

  it("rate limits frequent posters", async () => {
    recs.countRecentByAuthor.mockResolvedValue(10);
    expectError(await create({ appId: "620", body: "hi" }), 429, "posted a lot");
  });

  it("answers 502 when steam has no record of the game", async () => {
    games.getGamesInfo.mockResolvedValue([]);
    expectError(await create({ appId: "620", body: "hi" }), 502, "couldn't find that game");
  });

  it("saves a post using steam's achievement details, not the request's", async () => {
    const res = await create({
      appId: "620",
      body: "  Great game  ",
      score: 9,
      achievements: [{ apiName: "ACH_WAKE_UP", comment: " loved it ", name: "Spoofed name" }],
    });

    const saved = recs.insertRecommendation.mock.calls[0][0];
    expect(saved.body).toBe("Great game");
    expect(saved.score).toBe(9);
    expect(saved.author).toEqual({ steamId: user.steamId, name: "Me", avatar: "me.jpg" });
    expect(saved.achievements[0]).toMatchObject({
      apiName: "ACH_WAKE_UP",
      name: "Wake Up Call",
      unlocked: true,
      comment: "loved it",
    });

    expect(res.status).toHaveBeenCalledWith(201);
    const body = res.json.mock.calls[0][0];
    expect(body.isYours).toBe(true);
    expect(body).not.toHaveProperty("authorId");
    expect(JSON.stringify(body)).not.toContain(user._id);
  });

  it("removes the post again if its images were claimed by another request", async () => {
    images.findClaimableImages.mockResolvedValue([{ id: "a", url: "a.jpg" }]);
    images.attachImages.mockResolvedValue(false);

    const res = await create({ appId: "620", body: "hi", images: ["a"] });

    expect(recs.deleteRecommendation).toHaveBeenCalledWith("post-1", user._id);
    expect(images.detachImagesFromPost).toHaveBeenCalledWith("post-1");
    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe("removeRecommendation", () => {
  it("answers 404 and keeps images when the post isn't the user's", async () => {
    recs.deleteRecommendation.mockResolvedValue(false);
    const res = mockResponse();

    await removeRecommendation(request({ params: { id: "post-1" } }), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(images.deleteImagesForPost).not.toHaveBeenCalled();
  });

  it("deletes the post's images and answers 204", async () => {
    recs.deleteRecommendation.mockResolvedValue(true);
    const res = mockResponse();

    await removeRecommendation(request({ params: { id: "post-1" } }), res);

    expect(images.deleteImagesForPost).toHaveBeenCalledWith("post-1");
    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe("getFeed", () => {
  beforeEach(() => {
    recs.listRecommendations.mockResolvedValue({ items: [storedPost()], nextCursor: null });
  });

  it("limits 'mine' to the user's posts and trims the game search", async () => {
    await getFeed(request({ query: { game: "  portal  ", limit: "5" } }), mockResponse(), { scope: "mine" });

    expect(recs.listRecommendations).toHaveBeenCalledWith({
      authorId: user._id,
      authorSteamIds: undefined,
      gameTitle: "portal",
      before: undefined,
      limit: 5,
    });
    expect(friends.getIds).not.toHaveBeenCalled();
  });

  it("limits 'friends' to posts by the user's steam friends, read with their own key", async () => {
    friends.getIds.mockResolvedValue(["76561190000000001", "76561190000000002"]);

    await getFeed(request(), mockResponse(), { scope: "friends" });

    expect(friends.getIds).toHaveBeenCalledWith("key", user.steamId);
    expect(recs.listRecommendations.mock.calls[0][0]).toMatchObject({
      authorId: undefined,
      authorSteamIds: ["76561190000000001", "76561190000000002"],
    });
  });

  it("shows everyone's posts for 'all'", async () => {
    await getFeed(request(), mockResponse(), { scope: "all" });
    expect(recs.listRecommendations.mock.calls[0][0]).toMatchObject({
      authorId: undefined,
      authorSteamIds: undefined,
    });
  });

  it.each(["0", "31", "abc", "2.5"])("falls back to 10 per page for limit=%p", async (limit) => {
    await getFeed(request({ query: { limit } }), mockResponse(), { scope: "all" });
    expect(recs.listRecommendations.mock.calls[0][0]).toMatchObject({ authorId: undefined, limit: 10 });
  });

  it("marks posts by other users as not yours", async () => {
    const res = mockResponse();
    await getFeed(request({ user: { _id: "other@example.com" } }), res, { scope: "all" });
    expect(res.json.mock.calls[0][0].items[0].isYours).toBe(false);
  });
});

describe("searchGames", () => {
  it("looks a store link up directly", async () => {
    games.getGamesInfo.mockResolvedValue([game]);
    const res = mockResponse();

    await searchGames(request({ query: { q: "https://store.steampowered.com/app/620/Portal_2/" } }), res);

    expect(games.getGamesInfo).toHaveBeenCalledWith("key", ["620"]);
    expect(res.json).toHaveBeenCalledWith([{ id: 620, name: "Portal 2", image: "portal2.jpg" }]);
  });

  it("lists owned matches first, most played first, then other known games", async () => {
    games.getOwnedGames.mockResolvedValue([
      { id: 1, title: "Portal", playtime: 10 },
      { id: 2, title: "Portal 2", playtime: 500 },
      { id: 3, title: "Half-Life", playtime: 900 },
    ]);
    games.searchCachedGames.mockResolvedValue([
      { id: 2, name: "Portal 2", image: "p2.jpg" },
      { id: 4, name: "Portal Stories", image: "ps.jpg" },
    ]);
    const res = mockResponse();

    await searchGames(request({ query: { q: "portal" } }), res);

    expect(res.json.mock.calls[0][0]).toEqual([
      { id: 2, name: "Portal 2", image: "p2.jpg", owned: true },
      { id: 1, name: "Portal", image: null, owned: true },
      { id: 4, name: "Portal Stories", image: "ps.jpg", owned: false },
    ]);
  });

  it("still searches known games when the library is private", async () => {
    games.getOwnedGames.mockRejectedValue(new Error("private"));
    games.searchCachedGames.mockResolvedValue([{ id: 4, name: "Portal Stories", image: "ps.jpg" }]);
    const res = mockResponse();

    await searchGames(request({ query: { q: "portal" } }), res);

    expect(res.json.mock.calls[0][0]).toEqual([
      { id: 4, name: "Portal Stories", image: "ps.jpg", owned: false },
    ]);
  });
});
