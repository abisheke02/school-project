const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'testv3_db',
  user:     process.env.DB_USER     || 'testv3_user',
  password: process.env.DB_PASSWORD || 'testv3_password',
  ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

pool.on('error', (err) => console.error('[pg] Pool error:', err.message));

const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      console.warn('[db] Unreachable — mock response for:', text.substring(0, 60));
      return { rows: text.toLowerCase().includes('returning id') ? [{ id: '00000000-0000-0000-0000-000000000000' }] : [], rowCount: 0, fields: [] };
    }
    throw err;
  }
};

const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
