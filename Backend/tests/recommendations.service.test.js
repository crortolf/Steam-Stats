//declared before anything requires mongodb, since the mock factory reads it
const mockCollections = {};
jest.mock("mongodb", () => require("./helpers/mockMongo")(mockCollections));

const { ObjectId } = require("mongodb");
const { cursorOf } = require("./helpers/mockMongo");

const {
  insertRecommendation,
  listRecommendations,
  deleteRecommendation,
  countRecentByAuthor,
} = require("../services/recommendations");

const recommendations = () => mockCollections.Recommendations;

const post = (ms) => ({ _id: new ObjectId(), createdAt: new Date(ms) });

describe("insertRecommendation", () => {
  it("adds createdAt and returns the doc with its new id", async () => {
    recommendations().insertOne.mockResolvedValue({ insertedId: "new-id" });

    const result = await insertRecommendation({ body: "great" });

    expect(result._id).toBe("new-id");
    expect(result.body).toBe("great");
    expect(result.createdAt).toBeInstanceOf(Date);
  });
});

describe("listRecommendations", () => {
  it("asks for one more than the limit and returns no cursor on the last page", async () => {
    const cursor = cursorOf([post(3000), post(2000)]);
    recommendations().find.mockReturnValue(cursor);

    const result = await listRecommendations({ limit: 2 });

    expect(cursor.limit).toHaveBeenCalledWith(3);
    expect(cursor.sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBeNull();
  });

  it("trims the extra doc and returns a cursor for the last item", async () => {
    const docs = [post(3000), post(2000), post(1000)];
    recommendations().find.mockReturnValue(cursorOf(docs));

    const result = await listRecommendations({ limit: 2 });

    expect(result.items).toEqual(docs.slice(0, 2));
    expect(result.nextCursor).toBe(`2000_${docs[1]._id}`);
  });

  it("turns a cursor from a previous page back into a filter", async () => {
    const last = post(2000);
    recommendations().find.mockReturnValue(cursorOf([]));

    await listRecommendations({ before: `2000_${last._id}`, limit: 10 });

    const filter = recommendations().find.mock.calls[0][0];
    expect(filter.$or).toEqual([
      { createdAt: { $lt: new Date(2000) } },
      { createdAt: new Date(2000), _id: { $lt: last._id } },
    ]);
  });

  it.each([["garbage"], ["abc_123"], [`12_notanid`], [42]])(
    "ignores an invalid cursor (%p)",
    async (before) => {
      await listRecommendations({ before, limit: 10 });
      expect(recommendations().find.mock.calls[0][0].$or).toBeUndefined();
    },
  );

  it("filters by the authors' steam ids for the friends feed", async () => {
    await listRecommendations({ authorSteamIds: ["1", "2"], limit: 5 });

    expect(recommendations().find.mock.calls[0][0]).toEqual({
      "author.steamId": { $in: ["1", "2"] },
    });
  });

  it("returns an empty page without querying when there are no friends", async () => {
    const result = await listRecommendations({ authorSteamIds: [], limit: 5 });

    expect(result).toEqual({ items: [], nextCursor: null });
    expect(recommendations().find).not.toHaveBeenCalled();
  });

  it("filters by author and escapes regex characters in the game title", async () => {
    await listRecommendations({ authorId: "me@x.com", gameTitle: "C++ (2)", limit: 5 });

    expect(recommendations().find.mock.calls[0][0]).toEqual({
      authorId: "me@x.com",
      "game.name": { $regex: "C\\+\\+ \\(2\\)", $options: "i" },
    });
  });
});

describe("deleteRecommendation", () => {
  it("returns false without querying for an invalid id", async () => {
    expect(await deleteRecommendation("not-an-id", "me")).toBe(false);
    expect(recommendations().deleteOne).not.toHaveBeenCalled();
  });

  it("only deletes posts by that author", async () => {
    const id = new ObjectId();
    recommendations().deleteOne.mockResolvedValue({ deletedCount: 1 });

    expect(await deleteRecommendation(String(id), "me")).toBe(true);
    expect(recommendations().deleteOne).toHaveBeenCalledWith({ _id: id, authorId: "me" });
  });

  it("returns false when nothing matched", async () => {
    recommendations().deleteOne.mockResolvedValue({ deletedCount: 0 });
    expect(await deleteRecommendation(String(new ObjectId()), "someone-else")).toBe(false);
  });
});

describe("countRecentByAuthor", () => {
  it("counts posts newer than the window", async () => {
    recommendations().countDocuments.mockResolvedValue(3);

    expect(await countRecentByAuthor("me", 60_000)).toBe(3);
    const query = recommendations().countDocuments.mock.calls[0][0];
    expect(query.authorId).toBe("me");
    expect(Date.now() - query.createdAt.$gt.getTime()).toBeGreaterThanOrEqual(60_000);
  });
});
