const { Pool } = require("pg");

const URL_PG = "postgresql://postgres:1234@localhost:5432/netodonalds";

const database = new Pool({
  connectionString: URL_PG,
});

module.exports = database;
