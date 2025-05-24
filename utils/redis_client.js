const { createClient } = require('redis');

const redisClient = createClient();

redisClient.connect().catch(console.error);

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('ready', () => console.log('Redis connected'));

module.exports = redisClient;
