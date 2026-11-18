const { getIds, getFriendSince } = require("../services/friends");
const { retrievePlayerSummaries } = require("../services/players");
const { getFlaggedIds, maskName } = require("../services/flaggedUsers");

/**
 * Builds the friend network graph: the player, their friends, and which of
 * their friends know each other.
 *
 * Gets the friend list, then in parallel: the player's and friends' profile
 * summaries, the mutual friendships between friends (findMutualFriends), and
 * which of them have flagged usernames. Each profile is converted with
 * convertUserData and given its list of mutual friends.
 *
 * @param {string} key - The signed in user's steam api key.
 * @param {string} steamid - The player's 64-bit steam id.
 * @returns {Promise<{user: object, friends: object[]}>} The player and each
 *   friend as { username, steamid, avatar, status, censored, mutualFriendIds }.
 *   The player's mutualFriendIds is always empty.
 */
const getFriends = async (key, steamid) => {
  const friends = await getIds(key, steamid);

  const userData = retrievePlayerSummaries(key, [steamid]);
  const friendsData = retrievePlayerSummaries(key, friends);

  const mutuals = findMutualFriends(key, friends);
  const flagged = getFlaggedIds([steamid, ...friends]);

  return Promise.all([userData, friendsData, mutuals, flagged]).then(
    ([userPlayers, friendPlayers, mutualMap, flaggedIds]) => {
      const circle = {
        user: convertUserData(userPlayers[0], flaggedIds),
        friends: friendPlayers.map((user) => convertUserData(user, flaggedIds)),
      };
      circle.user.mutualFriendIds = [];
      circle.friends.forEach(
        (f) => (f.mutualFriendIds = [...(mutualMap.get(f.steamid) ?? [])]),
      );
      return circle;
    },
  );
};

/**
 * For each of the user's friends, finds which of the user's other friends they
 * are also friends with.
 *
 * A few workers share the list, each reading one friend's friend list at a
 * time (cache first), so steam isn't asked for every list at once. Friendship
 * is symmetric, so a link found from either side is recorded on both, which
 * covers friends whose own list is private. A list that fails to load counts as empty.
 *
 * @param {string} key - The signed in user's steam api key.
 * @param {string[]} friendIds - The user's friends' steam ids.
 * @param {number} [concurrency=8] - How many friend lists to read at once.
 * @returns {Promise<Map<string, Set<string>>>} Each friend's id mapped to the
 *   ids of the user's other friends they're friends with.
 */
const findMutualFriends = async (key, friendIds, concurrency = 8) => {
  const friendSet = new Set(friendIds);
  const mutualMap = new Map(friendIds.map((id) => [id, new Set()]));

  let next = 0;
  /**
   * Takes the next unread friend from the shared position until none are
   * left, reading their friend list and recording links both ways.
   *
   * @returns {Promise<void>} Resolves when there are no friends left to read.
   */
  const worker = async () => {
    while (next < friendIds.length) {
      const id = friendIds[next++];
      const theirFriends = await getIds(key, id).catch((e) => {
        console.error("mutuals for " + id + ": " + e.message);
        return [];
      });
      for (const other of theirFriends) {
        if (other === id || !friendSet.has(other)) continue;
        mutualMap.get(id).add(other);
        mutualMap.get(other).add(id);
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, friendIds.length) }, worker),
  );
  return mutualMap;
};

/**
 * Finds a chain of friends linking two players, up to four steps long.
 *
 * Searches outward from both players in turns: idOne's friends, then idTwo's,
 * then idOne's friends of friends, then idTwo's. Each step records who each
 * newly reached player was reached from (iterateFriendsList), then checks
 * whether the two searches have met (gatherConnection). It stops at the first
 * chain found and loads the profiles along it.
 *
 * @param {string} key - The signed in user's steam api key.
 * @param {string} idOne - The first player's steam id.
 * @param {string} idTwo - The second player's steam id.
 * @returns {Promise<object[]|{result: "no relation"}|undefined>} The players
 *   along the chain from idOne to idTwo, each as { username, steamid, avatar,
 *   status, censored }; { result: "no relation" } if none was found; undefined
 *   if loading the profiles failed. Rejects if an id is missing or both are the same.
 */
const findConnection = async (key, idOne, idTwo) => {
  console.log(idOne + " " + idTwo);
  if (!idOne || !idTwo) throw new Error("Please enter both Steam IDs.");

  if (idOne === idTwo) throw new Error("Please enter two different Steam IDs.");

  const userOneRelationships = {};
  const userTwoRelationships = {};
  let connectionString;

  const userOneSingleDegree = await iterateFriendsList(
    key,
    [idOne],
    true,
    userOneRelationships,
    userTwoRelationships,
  );
  connectionString = gatherConnection(
    idOne,
    idTwo,
    userOneRelationships,
    userTwoRelationships,
  );
  if (connectionString !== false) return collectUserInfo(key, connectionString);

  const userTwoSingleDegree = await iterateFriendsList(
    key,
    [idTwo],
    false,
    userOneRelationships,
    userTwoRelationships,
  );
  connectionString = gatherConnection(
    idOne,
    idTwo,
    userOneRelationships,
    userTwoRelationships,
  );
  if (connectionString !== false) return collectUserInfo(key, connectionString);

  const userOneDoubleDegree = await iterateFriendsList(
    key,
    userOneSingleDegree,
    true,
    userOneRelationships,
    userTwoRelationships,
  );
  connectionString = gatherConnection(
    idOne,
    idTwo,
    userOneRelationships,
    userTwoRelationships,
  );
  if (connectionString !== false) return collectUserInfo(key, connectionString);

  const userTwoDoubleDegree = await iterateFriendsList(
    key,
    userTwoSingleDegree,
    false,
    userOneRelationships,
    userTwoRelationships,
  );
  connectionString = gatherConnection(
    idOne,
    idTwo,
    userOneRelationships,
    userTwoRelationships,
  );
  if (connectionString !== false) return collectUserInfo(key, connectionString);

  return { result: "no relation" };
};

/**
 * Loads the profiles of the players along a friend chain, keeping the chain's order.
 *
 * Gets the profile summaries and flagged usernames in parallel, puts the
 * summaries back in chain order, and converts each with convertUserData.
 * Players without a summary are left out.
 *
 * @param {string} key - The signed in user's steam api key.
 * @param {string[]} orderedUserCodes - Steam ids in chain order.
 * @returns {Promise<object[]|undefined>} Each player as { username, steamid,
 *   avatar, status, censored }; undefined if loading failed (the error is logged).
 */
const collectUserInfo = (key, orderedUserCodes) => {
  return Promise.all([
    retrievePlayerSummaries(key, orderedUserCodes),
    getFlaggedIds(orderedUserCodes),
  ])
    .then(([unorderedUserData, flaggedIds]) => {
      const orderedUserData = [];
      for (let i = 0; i < orderedUserCodes.length; i++) {
        for (let j = 0; j < unorderedUserData.length; j++) {
          if (orderedUserCodes[i] === unorderedUserData[j].steamid) {
            orderedUserData.push(unorderedUserData[j]);
            j = 10;
          }
        }
      }

      return orderedUserData.map((user) => convertUserData(user, flaggedIds));
    })
    .catch((e) => console.error(e.message));
};

//player card data is refreshed from steam once the cached copy is 5 minutes old
const PLAYER_CARD_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Converts a steam time (unix seconds) into an ISO date string.
 *
 * @param {unknown} seconds - The time from steam; missing when a profile hides it.
 * @returns {string|null} ex: "2026-11-17T12:00:00.000Z", or null if seconds
 *   isn't a positive number.
 */
const unixToIso = (seconds) =>
  typeof seconds === "number" && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : null;

/**
 * Turns the gameid steam reports for a player's current game into a store app
 * id, if the game has a store page.
 *
 * Steam app ids fit in 32 bits; larger gameids are non-steam shortcuts or mods
 * that have no store page.
 *
 * @param {string|number|undefined} gameid - From the player's summary.
 * @returns {number|null} The app id, or null if it isn't a store game.
 */
const toStoreAppId = (gameid) => {
  const n = Number(gameid);
  return Number.isInteger(n) && n > 0 && n < 2 ** 32 ? n : null;
};

/**
 * Builds the details shown on a player's card in the friend network.
 *
 * In parallel, gets the player's summary (refetched from steam once the
 * cached copy is 5 minutes old), how long they've been friends with the viewer
 * (when friendOf is given), and whether their username is flagged. Then picks
 * out and formats the fields the card shows. For a flagged player, the real
 * name and custom profile url are hidden too, since they could reveal the name.
 *
 * @param {string} key - The signed in user's steam api key.
 * @param {string} steamid - The player's 64-bit steam id.
 * @param {string} [friendOf] - The viewing user's steam id, used to look up
 *   how long the two have been friends.
 * @returns {Promise<object|null>} { username, steamid, avatar, status,
 *   censored, realName, profileUrl, countryCode, isPublic, currentGame,
 *   currentGameAppId, friendSince, lastLogoff, timeCreated, fetchedAt }, with
 *   dates as ISO strings and hidden fields as null; null if steam has no such
 *   player. Rejects if steamid is missing.
 */
const getPlayerCard = async (key, steamid, friendOf) => {
  if (!steamid) throw new Error("Please provide a Steam ID.");
  const [[summary], friendSince, flaggedIds] = await Promise.all([
    retrievePlayerSummaries(key, [steamid], {
      maxAgeMs: PLAYER_CARD_MAX_AGE_MS,
      withUpdatedAt: true,
    }),
    friendOf && friendOf !== steamid
      ? getFriendSince(key, friendOf, steamid).catch((e) => {
          console.log("friend since lookup failed: " + e.message);
          return null;
        })
      : null,
    getFlaggedIds([steamid]),
  ]);
  if (!summary) return null;

  const user = convertUserData(summary, flaggedIds);
  return {
    ...user,
    //a flagged player's real name and custom profile url could show the name too
    realName: user.censored ? null : (summary.realname ?? null),
    profileUrl: user.censored
      ? `https://steamcommunity.com/profiles/${summary.steamid}/`
      : (summary.profileurl ?? null),
    countryCode: summary.loccountrycode ?? null,
    //3 = public; private profiles hide most fields, including timecreated
    isPublic: summary.communityvisibilitystate === 3,
    currentGame: summary.gameextrainfo ?? null,
    //only set when the current game has a steam store page
    currentGameAppId: summary.gameextrainfo
      ? toStoreAppId(summary.gameid)
      : null,
    friendSince: unixToIso(friendSince),
    lastLogoff: unixToIso(summary.lastlogoff),
    timeCreated: unixToIso(summary.timecreated),
    fetchedAt: summary.updatedAt
      ? new Date(summary.updatedAt).toISOString()
      : new Date().toISOString(),
  };
};

/**
 * Converts a steam profile summary into the form the frontend displays.
 *
 * Players in flaggedIds (see FlaggedUsers) get their name masked, and the
 * frontend pixelates their avatar when censored is set. The numeric
 * personastate becomes a readable status.
 *
 * @param {object} user - A summary from retrievePlayerSummaries.
 * @param {Set<string>} [flaggedIds] - Steam ids with flagged usernames.
 * @returns {{username: string, steamid: string, avatar: string, status: string,
 *   censored: boolean}}
 */
const convertUserData = (user, flaggedIds = new Set()) => {
  const censored = flaggedIds.has(user.steamid);
  return {
    username: censored ? maskName(user.personaname) : user.personaname,
    steamid: user.steamid,
    avatar: user.avatarfull,
    status: statusMap[user.personastate],
    censored,
  };
};

const statusMap = {
  0: "Offline",
  1: "Online",
  2: "Busy",
  3: "Away",
  4: "Snooze",
  5: "Looking to trade",
  6: "Looking to play",
};

/**
 * Takes one step outward in findConnection's search: reads the friend list of
 * every player in friendsList and records who each new player was reached from.
 *
 * Reads all the lists in parallel (cache first). Each player not already in
 * the side's relationships map is added, pointing back at the friend they were
 * reached through, and is returned for the next step. Lists that fail to load are skipped.
 *
 * @param {string} key - The signed in user's steam api key.
 * @param {string[]} friendsList - Steam ids reached in the previous step.
 * @param {boolean} userOne - true to search from the first player's side,
 *   false for the second's.
 * @param {Object<string, string>} userOneRelationships - The first player's
 *   search: each reached id mapped to who it was reached from. Changed in place.
 * @param {Object<string, string>} userTwoRelationships - The same for the
 *   second player. Changed in place.
 * @returns {Promise<string[]>} The newly reached steam ids.
 */
const iterateFriendsList = async (
  key,
  friendsList,
  userOne,
  userOneRelationships,
  userTwoRelationships,
) => {
  const newList = [];
  const requests = [];

  for (const friendCode of friendsList) {
    requests.push(
      getIds(key, friendCode)
        .then((secondaryFriends) => {
          for (const secondaryFriend of secondaryFriends) {
            const targetMap = userOne
              ? userOneRelationships
              : userTwoRelationships;
            if (!(secondaryFriend in targetMap)) {
              targetMap[secondaryFriend] = friendCode;
              newList.push(secondaryFriend);
            }
          }
        })
        .catch((e) => console.error(e.message)),
    );
  }

  await Promise.all(requests);
  return newList;
};

/**
 * Walks back from a reached player to where a search started, to get the chain between them.
 *
 * Follows each player's "reached from" entry until it gets to rootID. Stops
 * with null if an entry is missing or the walk loops.
 *
 * @param {Object<string, string>} parents - One side's relationships map from iterateFriendsList.
 * @param {string} nodeID - The player to walk back from.
 * @param {string} rootID - The player the search started from.
 * @returns {string[]|null} The chain from rootID to nodeID, or null if there isn't one.
 */
const buildPath = (parents, nodeID, rootID) => {
  const path = [nodeID];
  const seen = new Set([nodeID]);

  while (path[0] !== rootID) {
    const parent = parents[path[0]];
    if (!parent || seen.has(parent)) {
      return null;
    }
    path.unshift(parent);
    seen.add(parent);
  }

  return path;
};

/**
 * Checks whether the two searches in findConnection have met, and if so builds
 * the chain between the players.
 *
 * If idTwo has been reached from idOne's side, returns the two directly.
 * Otherwise looks for a player reached by both searches, walks back from it to
 * each start with buildPath, and joins the halves.
 *
 * @param {string} idOne - The first player's steam id.
 * @param {string} idTwo - The second player's steam id.
 * @param {Object<string, string>} userOneRelationships - The first player's search so far.
 * @param {Object<string, string>} userTwoRelationships - The second player's search so far.
 * @returns {string[]|false} Steam ids from idOne to idTwo, or false if the
 *   searches haven't met yet.
 */
const gatherConnection = (
  idOne,
  idTwo,
  userOneRelationships,
  userTwoRelationships,
) => {
  if (!idOne || !idTwo) {
    return false;
  }

  if (idTwo in userOneRelationships) {
    return [idOne, idTwo];
  }

  for (const userID of Object.keys(userOneRelationships)) {
    if (!(userID in userTwoRelationships)) {
      continue;
    }

    const pathOne = buildPath(userOneRelationships, userID, idOne);
    const pathTwo = buildPath(userTwoRelationships, userID, idTwo);
    if (!pathOne || !pathTwo) {
      continue;
    }

    const fullPath = pathOne.concat(pathTwo.slice(0, -1).reverse());
    return fullPath;
  }

  return false;
};

module.exports = { findConnection, getFriends, getPlayerCard };
