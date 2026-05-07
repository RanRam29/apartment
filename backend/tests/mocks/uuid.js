const { randomUUID } = require("crypto");

function v4() {
  return randomUUID();
}

function v1() {
  return randomUUID();
}

module.exports = { v1, v4 };
