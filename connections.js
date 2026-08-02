const myApiKey = "52852E7C5F7125BC5207C73C9BFC5423";
//const mySteamID = "76561198045843433";
let userOneRelationships = {};
let userTwoRelationships = {};
let currentUserOneID = null;
let currentUserTwoID = null;

const findConnection = async () => {
  const idOne = document.getElementById("user-one-steam-id").value.trim();
  const idTwo = document.getElementById("user-two-steam-id").value.trim();

  if (!idOne || !idTwo) {
    console.log("Please enter both Steam IDs.");
    return;
  }

  if (idOne === idTwo) {
    console.log("Please enter two different Steam IDs.");
    return;
  }

  currentUserOneID = idOne;
  currentUserTwoID = idTwo;
  userOneRelationships = {};
  userTwoRelationships = {};
  let connectionString;

  const userOneSingleDegree = await iterateFriendsList(
    [currentUserOneID],
    true,
  );
  connectionString = gatherConnection();
  if (connectionString !== false) {
    console.log("found single removal");
    collectUserInfo(connectionString);
    return;
  }

  const userTwoSingleDegree = await iterateFriendsList(
    [currentUserTwoID],
    false,
  );
  connectionString = gatherConnection();
  if (connectionString !== false) {
    console.log("found double removal");
    collectUserInfo(connectionString);
    return;
  }

  const userOneDoubleDegree = await iterateFriendsList(
    userOneSingleDegree,
    true,
  );
  connectionString = gatherConnection();
  if (connectionString !== false) {
    console.log("found triple removal");
    collectUserInfo(connectionString);
    return;
  }

  const userTwoDoubleDegree = await iterateFriendsList(
    userTwoSingleDegree,
    false,
  );
  connectionString = gatherConnection();
  if (connectionString !== false) {
    console.log("found quadruple removal");
    collectUserInfo(connectionString);
    return;
  }

  console.log("no relation found");

  //testing data saved in tesetConnection

  //collectUserInfo(testConnection);
};

const collectUserInfo = (orderedUserCodes) => {
  let unorderedUserData;

  axios
    .get(
      "http://localhost:3001/api/steam/ISteamUser/GetPlayerSummaries/v0002/",
      {
        params: {
          key: myApiKey,
          steamIds: orderedUserCodes.join(","),
        },
      },
    )
    .then((result) => (unorderedUserData = result.data.response.players))
    .then(() => {
      for (let i = 0; i < orderedUserCodes.length; i++) {
        for (let j = 0; j < orderedUserCodes.length; j++) {
          if (orderedUserCodes[i] === unorderedUserData[j].steamid) {
            orderedUserData.push(unorderedUserData[j]);
            j = 10;
          }
        }
      }

      displayUserData(orderedUserData);
    })
    .catch((e) => console.error(e));

  const orderedUserData = [];
};

const displayUserData = (userList) => {
  const container = document.getElementById("connections-container");
  let newUserConnection, arrow, i;

  i = 0;
  container.innerHTML = "";

  for (user of userList) {
    if (container.innerHTML !== "") {
      arrow = document.createElement("p");
      arrow.innerHTML = "/\\<br>||<br>||<br>\\/";
      arrow.style.textAlign = "center";
      container.append(arrow);
    }

    newUserConnection = document
      .getElementById("user-info-template")
      .content.cloneNode(true);

    newUserConnection.querySelector(".node-username").innerText =
      user.personaname;
    newUserConnection.querySelector(".node-steam-id").innerText =
      "ID64: " + user.steamid;
    newUserConnection.querySelector(".profile-image").src = user.avatarfull;
    newUserConnection.querySelector(".profile-image").alt =
      user.personaname + "'s profile photo";

    if (user.personastate === 0) {
      newUserConnection.querySelector(".node-status").innerText = "Offline";
      newUserConnection.querySelector(".node-status").style = "color: grey";
    } else if (user.personastate === 1) {
      newUserConnection.querySelector(".node-status").innerText = "Online";
      newUserConnection.querySelector(".node-status").style = "color: green";
    } else if (user.personastate === 2) {
      newUserConnection.querySelector(".node-status").innerText = "Busy";
      newUserConnection.querySelector(".node-status").style = "color: yellow";
    } else if (user.personastate === 3) {
      newUserConnection.querySelector(".node-status").innerText = "Away";
      newUserConnection.querySelector(".node-status").style = "color: yellow";
    } else if (user.personastate === 4) {
      newUserConnection.querySelector(".node-status").innerText = "Snooze";
      newUserConnection.querySelector(".node-status").style = "color: yellow";
    } else if (user.personastate === 5) {
      newUserConnection.querySelector(".node-status").innerText =
        "Looking to trade";
      newUserConnection.querySelector(".node-status").style = "color: green";
    } else if (user.personastate === 6) {
      newUserConnection.querySelector(".node-status").innerText =
        "Looking to play";
      newUserConnection.querySelector(".node-status").style = "color: green";
    } else {
      newUserConnection.querySelector(".node-status").innerText =
        "Error: unknown status";
    }

    newUserConnection.querySelector(".steam-blue-border").style.animationDelay =
      2 * i + "s";

    container.appendChild(newUserConnection);
    i++;
  }
};

//function used to iterate through a list of friends to retrieve their friends
const iterateFriendsList = async (friendsList, userOne) => {
  const newList = [];
  console.log("method called with value of: " + friendsList);
  const requests = [];

  for (const friendCode of friendsList) {
    requests.push(
      axios
        .get(
          "http://localhost:3001/api/steam/ISteamUser/GetFriendList/v0001/",
          {
            params: {
              key: myApiKey,
              steamid: friendCode,
              relationship: "friend",
            },
          },
        )
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
const gatherConnection = () => {
  if (!currentUserOneID || !currentUserTwoID) {
    return false;
  }

  if (currentUserTwoID in userOneRelationships) {
    return [currentUserOneID, currentUserTwoID];
  }

  for (const userID of Object.keys(userOneRelationships)) {
    if (!(userID in userTwoRelationships)) {
      continue;
    }

    const pathOne = buildPath(userOneRelationships, userID, currentUserOneID);
    const pathTwo = buildPath(userTwoRelationships, userID, currentUserTwoID);
    if (!pathOne || !pathTwo) {
      continue;
    }

    const fullPath = pathOne.concat(pathTwo.slice(0, -1).reverse());
    console.log("user in common has ID " + userID);
    console.log("connection path", fullPath);
    return fullPath;
  }

  return false;
};
