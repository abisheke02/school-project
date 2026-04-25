const { createClient } = require('redis');

let client = null;
let redisAvailable = false;

const connectRedis = async () => {
  client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      connectTimeout: 3000,
      reconnectStrategy: (retries) => {
        if (retries >= 3) {
          redisAvailable = false;
          return false; // stop retrying
        }
        return Math.min(retries * 500, 2000);
      },
    },
  });

  client.on('error', () => { redisAvailable = false; });
  client.on('ready', () => { redisAvailable = true; console.log('Redis connected'); });
  client.on('end', () => { redisAvailable = false; });

  try {
    await client.connect();
    redisAvailable = true;
  } catch {
    redisAvailable = false;
  }
};

// Called once at startup — non-blocking
const getRedisClient = () => client;

const set = async (key, value, ttlSeconds = 3600) => {
  if (!redisAvailable || !client?.isOpen) return;
  try {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch { /* Redis unavailable — silently skip caching */ }
};

const get = async (key) => {
  if (!redisAvailable || !client?.isOpen) return null;
  try {
    const val = await client.get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
};

const del = async (key) => {
  if (!redisAvailable || !client?.isOpen) return;
  try { await client.del(key); } catch { /* ignore */ }
};

module.exports = { connectRedis, getRedisClient, set, get, del };
