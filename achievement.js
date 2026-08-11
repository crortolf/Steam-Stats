const testGet = () => {
  axios.get("http://localhost:3001/GetFriends/", {
    params: {
      ids: "this is my id",
    },
  });
};
