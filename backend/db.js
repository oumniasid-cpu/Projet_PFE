const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'buildtrack',
  password: '1234',
  port: 5432,
});


pool.on('connect', () => {
  console.log('Connected to the database');
});

module.exports = pool;
