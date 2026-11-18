//fills the Friends feed with mock posts written as one player's real steam
//friends, for trying the friends filter out. reads only what the site has
//already cached (no steam api requests):
//  - the player's steam id, from PlayerSummaries (by persona name)
//  - their friend list, from FriendsList
//  - each friend's name and avatar, from PlayerSummaries
//  - games and achievements, from Games (games a friend owns, per OwnedGames, first)
//
//  node scripts/seedFriendRecommendations.js                    replace the mock data
//  node scripts/seedFriendRecommendations.js --name "Someone"   for another player
//  node scripts/seedFriendRecommendations.js --remove           delete the mock data
//
//everything it writes is marked seed: "friends", so it never touches real posts
//or the community mock posts from seedRecommendations.js (seed: true).
//the friends are only post authors here: no accounts are made for them

const mc = require("mongodb");
const { scopedId } = require("../services/cache");

const DEFAULT_PERSONA = "Colonel Fluffiluffiguss";
const MAX_FRIENDS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Reads the value that follows a flag on the command line.
 *
 * @param {string} flag - ex: "--name".
 * @returns {string|undefined} The next argument after the flag, or undefined
 *   if the flag wasn't given.
 */
const argValue = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
};

let rngState = 20261116;
/**
 * A seeded random number generator, so every run makes the same mock data.
 *
 * A linear congruential generator: each call advances rngState and scales it into [0, 1).
 *
 * @returns {number} A number from 0 (inclusive) to 1 (exclusive).
 */
const random = () => {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
};
/**
 * Picks one random entry from a list.
 *
 * @param {Array} list - The list to pick from; must not be empty.
 * @returns {*} One of its entries.
 */
const pick = (list) => list[Math.floor(random() * list.length)];
/**
 * Picks up to n different random entries from a list.
 *
 * Removes random entries from a copy until it has n or the copy runs out, so
 * the list passed in isn't changed.
 *
 * @param {Array} list - The list to pick from.
 * @param {number} n - How many to pick.
 * @returns {Array} min(n, list.length) entries, in random order.
 */
const pickSome = (list, n) => {
  const copy = [...list];
  const out = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(random() * copy.length), 1)[0]);
  }
  return out;
};

/**
 * Makes text safe to use inside a regular expression.
 *
 * @param {string} text - Text that should be matched literally.
 * @returns {string} The text with a backslash before every special character.
 */
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---- what the friends write ----

const BODIES = [
  "You need to play this. I'm not asking.",
  "Picked it up on sale and lost the whole weekend. Worth every minute.",
  "Took a while to click, but once it did I couldn't put it down.",
  "We should play this together sometime. I'll carry. Probably.",
  "Short, sweet, and the ending got me.",
  "The soundtrack alone is worth the price.",
  "Harder than it looks. I died a lot and loved it anyway.",
  "Perfect for a couple of hours after work.",
  "I keep coming back to this one every few months.",
  "Ignore the reviews complaining about difficulty. It's fair, you just have to learn it.",
  "Bought it because you kept talking about it. You were right.",
  "Great with friends, still good solo.",
  "Not for everyone, but if it hooks you it really hooks you.",
  "Went in expecting nothing and it ended up being my game of the year.",
  "Do yourself a favour and play it without looking anything up.",
];

//"{a}" is replaced with the achievement's name
const UNLOCKED_COMMENTS = [
  "{a} took me three evenings. Worth it.",
  "Got {a} completely by accident and screamed.",
  "{a} is the one I'm proudest of in the whole game.",
  "Cheesed {a} a little. No regrets.",
  "If you go for one achievement, make it {a}.",
  "{a} sounds easy. It is not.",
  "Finally got {a} at 2am. Sleep is for the weak.",
  "Watch out for {a}, you can miss it if you rush.",
];
const LOCKED_COMMENTS = [
  "Still haven't got {a}. Race you to it?",
  "{a} has beaten me more times than I can count.",
  "Saving {a} for my second playthrough.",
  "How does anyone actually get {a}?",
  "Missed {a} and can't go back. Ugh.",
  "{a} is next on my list.",
];

// ---- reading the cache ----

/**
 * Gets the newest cached profile summary for each of several players.
 *
 * Reads every PlayerSummaries record for these ids (from any api key, newest
 * first) and keeps the first one per player that has a name. Older cache
 * records without a steamId are skipped.
 *
 * @param {import("mongodb").Collection} summaries - The PlayerSummaries collection.
 * @param {string[]} steamIds - The players' steam ids.
 * @returns {Promise<Map<string, object>>} Each player's summary record by steam
 *   id. Players with no cached summary are missing.
 */
const latestSummaries = async (summaries, steamIds) => {
  const records = await summaries
    .find({ steamId: { $in: steamIds, $type: "string" } })
    .sort({ updatedAt: -1 })
    .toArray();
  const byId = new Map();
  for (const r of records) {
    if (!byId.has(r.steamId) && r.personaname) byId.set(r.steamId, r);
  }
  return byId;
};

/**
 * Lists the games a player owns, from the newest cached library under any api key.
 *
 * @param {import("mongodb").Collection} owned - The OwnedGames collection.
 * @param {string} steamId - The player's steam id.
 * @returns {Promise<number[]>} The app ids; empty if no library is cached.
 */
const ownedAppIds = async (owned, steamId) => {
  const record = await owned.findOne(
    { steamId: { $eq: steamId }, games: { $exists: true, $ne: [] } },
    { sort: { updatedAt: -1 } },
  );
  return (record?.games ?? []).map((g) => g.id);
};

/**
 * Runs the script: removes the previous mock friend posts, then (unless
 * --remove was given) writes new ones.
 *
 * Finds the player by name, reads their friend list (the one cached under
 * their account's own key when there is one, so it matches the Friends feed),
 * picks up to 8 friends with cached profiles, and writes 1 to 3 posts for each,
 * preferring games the friend owns. Each post highlights 1 to 3 of the game's
 * achievements with a comment that names it.
 *
 * @returns {Promise<void>} Rejects with a message saying what isn't cached yet
 *   if the player, their friend list, their friends' profiles or any games
 *   with achievements are missing.
 */
const main = async () => {
  const client = await mc.MongoClient.connect("mongodb://localhost:27017");
  const db = client.db("Steam-Stats");
  const recommendations = db.collection("Recommendations");

  const removed = await recommendations.deleteMany({ seed: "friends" });
  console.log(`removed ${removed.deletedCount} mock friend posts`);
  if (process.argv.includes("--remove")) return client.close();

  const summaries = db.collection("PlayerSummaries");
  const persona = argValue("--name") ?? DEFAULT_PERSONA;

  //older cache records (from before caching per key) have no steamId, skip them
  const me = await summaries.findOne(
    {
      personaname: { $regex: `^${escapeRegex(persona)}$`, $options: "i" },
      steamId: { $type: "string" },
    },
    { sort: { updatedAt: -1 } },
  );
  if (me === null) {
    throw new Error(
      `no cached steam profile named "${persona}". Sign in and open the network page once so the site caches it.`,
    );
  }

  //the friends feed reads the list cached under the account's own api key,
  //so use that one when there's an account for this steam id
  const friendsLists = db.collection("FriendsList");
  const account = await db
    .collection("Users")
    .findOne({ steamId: me.steamId, steamApiKey: { $type: "string" } });
  const friendList =
    (account &&
      (await friendsLists.findOne({
        _id: scopedId(account.steamApiKey, me.steamId),
      }))) ??
    (await friendsLists.findOne(
      { steamId: me.steamId, friends: { $exists: true, $ne: [] } },
      { sort: { updatedAt: -1 } },
    ));
  const friendIds = (friendList?.friends ?? []).map((f) => f.id);
  if (friendIds.length === 0) {
    throw new Error(
      `no cached friend list for ${me.personaname}. Open the network page once so the site caches it.`,
    );
  }

  const friendSummaries = await latestSummaries(summaries, friendIds);
  const friends = pickSome([...friendSummaries.values()], MAX_FRIENDS);
  if (friends.length === 0) {
    throw new Error("none of the friends have a cached profile yet.");
  }

  //only games with at least two achievements, so there's something to highlight
  const games = await db
    .collection("Games")
    .find({ "achievements.1": { $exists: true } })
    .project({ _id: 1, name: 1, image: 1, achievements: 1 })
    .toArray();
  if (games.length === 0) {
    throw new Error("no games with achievements are cached in Games yet.");
  }
  const gamesById = new Map(games.map((g) => [g._id, g]));
  const owned = db.collection("OwnedGames");

  const docs = [];
  for (const friend of friends) {
    //games this friend owns come first, any cached game otherwise
    const theirs = (await ownedAppIds(owned, friend.steamId))
      .map((id) => gamesById.get(id))
      .filter(Boolean);
    const pool = theirs.length >= 3 ? theirs : games;
    const postCount = 1 + Math.floor(random() * 3);

    for (const game of pickSome(pool, postCount)) {
      //shuffled per post, so no two highlights in one post share a comment
      const unlockedComments = pickSome(UNLOCKED_COMMENTS, UNLOCKED_COMMENTS.length);
      const lockedComments = pickSome(LOCKED_COMMENTS, LOCKED_COMMENTS.length);
      const achievements = pickSome(game.achievements, 1 + Math.floor(random() * 3)).map(
        (a) => {
          const name = a.displayName ?? a.name;
          const unlocked = random() < 0.7;
          const comment = (unlocked ? unlockedComments : lockedComments).shift();
          return {
            apiName: a.name,
            name,
            description: a.description ?? "",
            icon: a.icon,
            iconGray: a.icongray,
            unlocked,
            comment: comment.replace("{a}", name),
            images: [],
          };
        },
      );

      docs.push({
        //not a real account, so the post is never shown as yours
        authorId: `friend-${friend.steamId}@seed.test`,
        author: {
          steamId: friend.steamId,
          name: friend.personaname,
          avatar: friend.avatarfull ?? null,
        },
        game: { id: game._id, name: game.name, image: game.image },
        body: pick(BODIES),
        score: random() < 0.2 ? null : 6 + Math.floor(random() * 5),
        images: [],
        achievements,
        //spread over the last three weeks
        createdAt: new Date(Date.now() - Math.floor(random() * 21 * DAY_MS)),
        seed: "friends",
      });
    }
  }

  await recommendations.insertMany(docs);
  const highlights = docs.reduce((n, d) => n + d.achievements.length, 0);
  console.log(
    `added ${docs.length} posts with ${highlights} highlighted achievements from ${friends.length} of ${me.personaname}'s ${friendIds.length} friends:`,
  );
  for (const f of friends) console.log(`  ${f.personaname}`);
  await client.close();
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
