const myApiKey = "52852E7C5F7125BC5207C73C9BFC5423";
//const mySteamID = "76561198045843433";
let userOneRelationships = {};
let userTwoRelationships = {};
let idOne = null;
let idTwo = null;

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

  axios
    .get("http://localhost:3001/GetConnection", {
      params: {
        idOne: idOne,
        idTwo: idTwo,
      },
    })
    .then((results) => {
      console.log(results);
      displayUserData(results.data);
    });
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
      arrow.style.paddingLeft = "200px";
      container.append(arrow);
    }

    newUserConnection = document
      .getElementById("user-info-template")
      .content.cloneNode(true);

    newUserConnection.querySelector(".node-username").innerText = user.username;
    newUserConnection.querySelector(".node-steam-id").innerText =
      "ID64: " + user.steamid;
    newUserConnection.querySelector(".profile-image").src = user.avatar;
    newUserConnection.querySelector(".profile-image").alt =
      user.username + "'s profile photo";

    if (user.status === 0) {
      newUserConnection.querySelector(".node-status").innerText = "Offline";
      newUserConnection.querySelector(".node-status").style = "color: grey";
    } else if (user.status === 1) {
      newUserConnection.querySelector(".node-status").innerText = "Online";
      newUserConnection.querySelector(".node-status").style = "color: green";
    } else if (user.status === 2) {
      newUserConnection.querySelector(".node-status").innerText = "Busy";
      newUserConnection.querySelector(".node-status").style = "color: yellow";
    } else if (user.status === 3) {
      newUserConnection.querySelector(".node-status").innerText = "Away";
      newUserConnection.querySelector(".node-status").style = "color: yellow";
    } else if (user.status === 4) {
      newUserConnection.querySelector(".node-status").innerText = "Snooze";
      newUserConnection.querySelector(".node-status").style = "color: yellow";
    } else if (user.status === 5) {
      newUserConnection.querySelector(".node-status").innerText =
        "Looking to trade";
      newUserConnection.querySelector(".node-status").style = "color: green";
    } else if (user.status === 6) {
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
