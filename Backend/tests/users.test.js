const mockCollections = {};
jest.mock("mongodb", () => require("./helpers/mockMongo")(mockCollections));
jest.mock("axios");

const axios = require("axios");
const {
  createUser,
  checkCredentials,
  verifyPassword,
  resolveSteamId,
  isSteamApiKeyAccepted,
  createSession,
  getSessionUser,
} = require("../services/users");

const users = () => mockCollections.Users;
const sessions = () => mockCollections.Sessions;

const STEAM_ID = "76561197960435530";

//scrypt is deliberately slow, so the password tests share one hash
let alice;
let inserted;
beforeAll(async () => {
  alice = await createUser("alice@example.com", "correct horse");
  //kept here because clearMocks wipes recorded calls before each test
  inserted = users().insertOne.mock.calls[0][0];
}, 20_000);

describe("passwords", () => {
  it("stores a scrypt hash, not the password", () => {
    expect(alice.passwordHash).toMatch(/^scrypt\$\d+\$\d+\$\d+\$[^$]+\$[^$]+$/);
    expect(alice.passwordHash).not.toContain("correct horse");
  });

  it("creates the account with an insert so existing emails can't be overwritten", () => {
    expect(inserted).toEqual(
      expect.objectContaining({ _id: "alice@example.com", steamApiKey: null }),
    );
  });

  it("verifies the right password and rejects a wrong one", async () => {
    expect(await verifyPassword("correct horse", alice.passwordHash)).toBe(true);
    expect(await verifyPassword("wrong horse", alice.passwordHash)).toBe(false);
  });

  it("checkCredentials returns the user only for the right password", async () => {
    users().findOne.mockResolvedValue(alice);

    expect(await checkCredentials("alice@example.com", "correct horse")).toBe(alice);
    expect(await checkCredentials("alice@example.com", "nope")).toBeNull();
  });

  it("checkCredentials returns null for an unknown email", async () => {
    users().findOne.mockResolvedValue(null);
    expect(await checkCredentials("nobody@example.com", "anything")).toBeNull();
  });
});

describe("resolveSteamId", () => {
  it("accepts a 64-bit steam id as is, trimming whitespace", async () => {
    expect(await resolveSteamId("key", `  ${STEAM_ID} `)).toBe(STEAM_ID);
  });

  it("reads the id from a profiles url, with or without a trailing slash", async () => {
    expect(await resolveSteamId("key", `https://steamcommunity.com/profiles/${STEAM_ID}/`)).toBe(
      STEAM_ID,
    );
  });

  it("rejects a profiles url whose id isn't a steam id", async () => {
    expect(await resolveSteamId("key", "https://steamcommunity.com/profiles/12345")).toBeNull();
    expect(axios.get).not.toHaveBeenCalled();
  });

  it("looks up a custom url name with steam", async () => {
    axios.get.mockResolvedValue({ data: { response: { success: 1, steamid: STEAM_ID } } });

    expect(await resolveSteamId("key", "https://steamcommunity.com/id/gabe")).toBe(STEAM_ID);
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining("ResolveVanityURL"),
      { params: { key: "key", vanityurl: "gabe" } },
    );
  });

  it("returns null when steam doesn't know the name", async () => {
    axios.get.mockResolvedValue({ data: { response: { success: 42 } } });
    expect(await resolveSteamId("key", "nobody-here")).toBeNull();
  });

  it("can't look up a name without an api key", async () => {
    expect(await resolveSteamId(null, "gabe")).toBeNull();
    expect(axios.get).not.toHaveBeenCalled();
  });

  it("returns null for input that isn't a name, id or url", async () => {
    expect(await resolveSteamId("key", "not a valid name!")).toBeNull();
  });
});

describe("isSteamApiKeyAccepted", () => {
  it("is true when steam answers", async () => {
    axios.get.mockResolvedValue({ data: {} });
    expect(await isSteamApiKeyAccepted("key")).toBe(true);
  });

  it.each([401, 403])("is false when steam answers %i", async (status) => {
    axios.get.mockRejectedValue({ response: { status } });
    expect(await isSteamApiKeyAccepted("bad")).toBe(false);
  });

  it("passes other errors on", async () => {
    axios.get.mockRejectedValue(new Error("network down"));
    await expect(isSteamApiKeyAccepted("key")).rejects.toThrow("network down");
  });
});

describe("sessions", () => {
  it("stores only a hash of the token", async () => {
    const token = await createSession("alice@example.com");

    const stored = sessions().insertOne.mock.calls[0][0];
    expect(stored._id).not.toBe(token);
    expect(stored._id).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.userId).toBe("alice@example.com");
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("returns the user for a current session", async () => {
    sessions().findOne.mockResolvedValue({
      userId: "alice@example.com",
      expiresAt: new Date(Date.now() + 60_000),
    });
    users().findOne.mockResolvedValue(alice);

    expect(await getSessionUser("token")).toBe(alice);
  });

  it("returns null for an expired or unknown session", async () => {
    sessions().findOne.mockResolvedValueOnce({
      userId: "alice@example.com",
      expiresAt: new Date(Date.now() - 1),
    });
    expect(await getSessionUser("old")).toBeNull();

    sessions().findOne.mockResolvedValueOnce(null);
    expect(await getSessionUser("unknown")).toBeNull();
  });
});
