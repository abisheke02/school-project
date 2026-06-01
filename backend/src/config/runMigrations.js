const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

const runMigrations = async () => {
  const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME     || 'testv3_db',
    user:     process.env.DB_USER     || 'testv3_user',
    password: process.env.DB_PASSWORD || 'testv3_password',
    ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (filename VARCHAR(200) PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    const migrationsDir = path.join(__dirname, '../../migrations');
    if (!fs.existsSync(migrationsDir)) { console.log('[migrations] No migrations dir, skipping.'); return; }
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of files) {
      const { rows } = await client.query('SELECT filename FROM schema_migrations WHERE filename = $1', [file]);
      if (rows.length > 0) continue;
      console.log(`[migrations] Applying ${file}…`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[migrations] ✓ ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[migrations] ✗ ${file}: ${err.message}`);
        throw err;
      }
    }
    console.log('[migrations] All up to date.');
  } finally {
    client.release();
    await pool.end();
  }
};

module.exports = { runMigrations };
