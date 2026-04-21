const { createClient } = require('redis');

let client;

const getRedisClient = async () => {
  if (client && client.isOpen) return client;

  client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: { reconnectStrategy: (retries) => Math.min(retries * 100, 3000) },
  });

  client.on('error', (err) => console.error('Redis error:', err));
  client.on('connect', () => console.log('Redis connected'));

  await client.connect();
  return client;
};

const set = async (key, value, ttlSeconds = 3600) => {
  const c = await getRedisClient();
  await c.set(key, JSON.stringify(value), { EX: ttlSeconds });
};

const get = async (key) => {
  const c = await getRedisClient();
  const val = await c.get(key);
  return val ? JSON.parse(val) : null;
};

const del = async (key) => {
  const c = await getRedisClient();
  await c.del(key);
};

module.exports = { getRedisClient, set, get, del };
