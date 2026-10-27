const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const isSupabase = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction || isSupabase ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
