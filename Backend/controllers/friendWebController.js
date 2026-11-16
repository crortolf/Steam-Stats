const { getIds, getFriendSince } = require("../services/friends");
const { retrievePlayerSummaries } = require("../services/players");
const { getFlaggedIds, maskName } = require("../services/flaggedUsers");

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

// For each of the user's friends, find which of the user's other friends they
// are also friends with. Friendship is symmetric, so a link found from either
// side counts (this covers friends whose own list is private).
const findMutualFriends = async (key, friendIds, concurrency = 8) => {
  const friendSet = new Set(friendIds);
  const mutualMap = new Map(friendIds.map((id) => [id, new Set()]));

  let next = 0;
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

//steam reports times as unix seconds; convert to ISO strings (or null if hidden)
const unixToIso = (seconds) =>
  typeof seconds === "number" && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : null;

//steam app ids fit in 32 bits; larger gameids are non-steam shortcuts or mods
//that have no store page
const toStoreAppId = (gameid) => {
  const n = Number(gameid);
  return Number.isInteger(n) && n > 0 && n < 2 ** 32 ? n : null;
};

//friendOf: optional id of the viewing user, used to look up how long the two
//have been friends
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

//convert returned api userdata into a form we want to display
//players in flaggedIds (see FlaggedUsers) get their name masked, and the
//frontend pixelates their avatar when censored is set
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

//function used to iterate through a list of friends to retrieve their friends
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

//function to find and display the connection between two accounts, returns boolean representing if the relation was found
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
