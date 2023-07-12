const knex = require("knex");

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PW,
    database: process.env.DB_DATABASE,
    timezone: 'Asia/Seoul',
    connectTimeout: 10000 // 연결 시도 제한 시간 (10초)
    
  },
  useNullAsDefault: true
});

module.exports = db;
