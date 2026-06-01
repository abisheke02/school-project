const { createClient } = require('redis');

let client = null;
let redisAvailable = false;

const connectRedis = async () => {
  client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      connectTimeout: 3000,
      reconnectStrategy: (retries) => {
        if (retries >= 3) { redisAvailable = false; return false; }
        return Math.min(retries * 500, 2000);
      },
    },
  });
  client.on('error', () => { redisAvailable = false; });
  client.on('ready', () => { redisAvailable = true; console.log('[redis] Connected'); });
  try { await client.connect(); redisAvailable = true; } catch { redisAvailable = false; }
};

const set = async (key, value, ttlSeconds = 3600) => {
  if (!redisAvailable || !client?.isOpen) return;
  try { await client.set(key, JSON.stringify(value), { EX: ttlSeconds }); } catch {}
};

const get = async (key) => {
  if (!redisAvailable || !client?.isOpen) return null;
  try { const v = await client.get(key); return v ? JSON.parse(v) : null; } catch { return null; }
};

const del = async (key) => {
  if (!redisAvailable || !client?.isOpen) return;
  try { await client.del(key); } catch {}
};

module.exports = { connectRedis, set, get, del };
