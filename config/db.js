const knex = require("knex");

const db = knex({
  client: 'mysql',
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PW,
    database: process.env.DB_DATABASE,
    pool: {
      min: 0,
      max: 10
    },
    acquireConnectionTimeout: 10000
  },
  useNullAsDefault: true
});

module.exports = db;