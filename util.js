const axios = require("axios");
const { GITOPIA_API_URL } = require("./config");

async function getUsername(address) {
  const response = await axios.get(`${GITOPIA_API_URL}/user/${address}`);

  // Ensure the response data contains a username
  if (response.data && response.data.User.username) {
    if (response.data.User.username !== "") {
      return response.data.User.username;
    }

    return address;
  } else {
    throw new Error("Unable to retrieve username");
  }
}

async function getDAOname(address) {
  const response = await axios.get(`${GITOPIA_API_URL}/dao/${address}`);

  // Ensure the response data contains a name
  if (response.data && response.data.dao.name) {
    return response.data.dao.name;
  } else {
    throw new Error("Unable to retrieve DAO name");
  }
}

module.exports = { getUsername, getDAOname };
