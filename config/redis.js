const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('ready', () => console.log('Redis connected'));

redisClient.connect();

module.exports = redisClient;
