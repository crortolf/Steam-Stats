const { isStale, cacheFailure, keyScope, scopedId } = require("../services/cache");

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const ago = (ms) => new Date(Date.now() - ms);

describe("isStale", () => {
  it("treats a missing record as stale", () => {
    expect(isStale(null)).toBe(true);
  });

  it("treats a record without updatedAt as stale", () => {
    expect(isStale({})).toBe(true);
  });

  it("is fresh within the default 24 hour window", () => {
    expect(isStale({ updatedAt: ago(23 * HOUR_MS) })).toBe(false);
  });

  it("is stale after the default 24 hour window", () => {
    expect(isStale({ updatedAt: ago(DAY_MS + 1000) })).toBe(true);
  });

  it("respects a shorter maxAgeMs", () => {
    const record = { updatedAt: ago(10 * 60 * 1000) };
    expect(isStale(record, 5 * 60 * 1000)).toBe(true);
    expect(isStale(record, 15 * 60 * 1000)).toBe(false);
  });

  describe("failed records", () => {
    it("waits an hour before retrying a failure", () => {
      expect(isStale({ failedAt: ago(30 * 60 * 1000) })).toBe(false);
      expect(isStale({ failedAt: ago(HOUR_MS + 1000) })).toBe(true);
    });

    it("ignores updatedAt when the record has failed", () => {
      const record = { failedAt: ago(30 * 60 * 1000), updatedAt: ago(10 * DAY_MS) };
      expect(isStale(record)).toBe(false);
    });

    it("retries sooner when maxAgeMs is shorter than the retry window", () => {
      expect(isStale({ failedAt: ago(10 * 60 * 1000) }, 5 * 60 * 1000)).toBe(true);
    });
  });
});

describe("keyScope / scopedId", () => {
  it("is deterministic and 24 hex characters", () => {
    expect(keyScope("abc")).toBe(keyScope("abc"));
    expect(keyScope("abc")).toMatch(/^[0-9a-f]{24}$/);
  });

  it("gives different keys different scopes", () => {
    expect(keyScope("key-one")).not.toBe(keyScope("key-two"));
  });

  it("never contains the raw key", () => {
    expect(keyScope("MYSECRETKEY")).not.toContain("MYSECRETKEY");
  });

  it("prefixes the id with the key scope", () => {
    expect(scopedId("abc", "7656")).toBe(`${keyScope("abc")}:7656`);
  });
});

describe("cacheFailure", () => {
  it("upserts failedAt with a pipeline that keeps an existing updatedAt", async () => {
    const collection = { updateOne: jest.fn().mockResolvedValue({}) };

    await cacheFailure(collection, { _id: "x" });

    const [filter, pipeline, options] = collection.updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: "x" });
    expect(options).toEqual({ upsert: true });
    expect(pipeline[0].$set.failedAt).toBeInstanceOf(Date);
    expect(pipeline[0].$set.updatedAt.$ifNull[0]).toBe("$updatedAt");
  });

  it("swallows database errors", async () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    const collection = { updateOne: jest.fn().mockRejectedValue(new Error("down")) };

    await expect(cacheFailure(collection, { _id: "x" })).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith("down");
    log.mockRestore();
  });
});
