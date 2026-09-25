const axios = require("axios");
const myApiKey = "52852E7C5F7125BC5207C73C9BFC5423";
//const mySteamID = "76561198045843433";

const getFriends = async (steamid) => {
  const friendsListResponse = await axios.get(
    "https://api.steampowered.com/ISteamUser/GetFriendList/v0001/",
    {
      params: {
        key: myApiKey,
        steamId: steamid,
      },
    },
  );

  const userData = axios.get(
    "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/",
    {
      params: {
        key: myApiKey,
        steamids: steamid,
      },
    },
  );

  const friends = friendsListResponse.data.friendslist.friends.map(
    (friend) => friend.steamid,
  );

  const friendsData = axios.get(
    "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/",
    {
      params: {
        key: myApiKey,
        steamids: friends.join(","),
      },
    },
  );

  //return friendsData.data.response.players.map((user) => convertUserData(user));
  return Promise.all([userData, friendsData]).then(
    ([userResponse, friendsResponse]) => {
      const circle = {
        user: convertUserData(userResponse.data.response.players[0]),
        friends: friendsResponse.data.response.players.map((user) =>
          convertUserData(user),
        ),
      };
      circle.user.mutualFriendIds = [];
      circle.friends.forEach((f) => (f.mutualFrriendIds = []));
      return circle;
    },
  );
};

const findConnection = async (idOne, idTwo) => {
  console.log(idOne + " " + idTwo);
  if (!idOne || !idTwo) throw new Error("Please enter both Steam IDs.");

  if (idOne === idTwo) throw new Error("Please enter two different Steam IDs.");

  const userOneRelationships = {};
  const userTwoRelationships = {};
  let connectionString;

  const userOneSingleDegree = await iterateFriendsList(
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
  if (connectionString !== false) return collectUserInfo(connectionString);

  const userTwoSingleDegree = await iterateFriendsList(
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
  if (connectionString !== false) return collectUserInfo(connectionString);

  const userOneDoubleDegree = await iterateFriendsList(
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
  if (connectionString !== false) return collectUserInfo(connectionString);

  const userTwoDoubleDegree = await iterateFriendsList(
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
  if (connectionString !== false) return collectUserInfo(connectionString);

  return { result: "no relation" };
};

const collectUserInfo = (orderedUserCodes) => {
  return axios
    .get("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/", {
      params: {
        key: myApiKey,
        steamIds: orderedUserCodes.join(","),
      },
    })
    .then((result) => result.data.response.players)
    .then((unorderedUserData) => {
      const orderedUserData = [];
      for (let i = 0; i < orderedUserCodes.length; i++) {
        for (let j = 0; j < orderedUserCodes.length; j++) {
          if (orderedUserCodes[i] === unorderedUserData[j].steamid) {
            orderedUserData.push(unorderedUserData[j]);
            j = 10;
          }
        }
      }

      return orderedUserData.map(convertUserData);
    })
    .catch((e) => console.error(e));
};

//convert returned api userdata into a form we want to display
const convertUserData = (user) => {
  return {
    username: user.personaname,
    steamid: user.steamid,
    avatar: user.avatarfull,
    status: statusMap[user.personastate],
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
  friendsList,
  userOne,
  userOneRelationships,
  userTwoRelationships,
) => {
  const newList = [];
  const requests = [];

  for (const friendCode of friendsList) {
    requests.push(
      axios
        .get("https://api.steampowered.com/ISteamUser/GetFriendList/v0001/", {
          params: {
            key: myApiKey,
            steamid: friendCode,
            relationship: "friend",
          },
        })
        .then((response) => {
          if (
            !response.data ||
            !response.data.friendslist ||
            !Array.isArray(response.data.friendslist.friends)
          ) {
            return;
          }

          for (const secondaryFriend of response.data.friendslist.friends) {
            const targetMap = userOne
              ? userOneRelationships
              : userTwoRelationships;
            if (!(secondaryFriend.steamid in targetMap)) {
              targetMap[secondaryFriend.steamid] = friendCode;
              newList.push(secondaryFriend.steamid);
            }
          }
        })
        .catch((e) => console.error(e)),
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

module.exports = { findConnection, getFriends };
