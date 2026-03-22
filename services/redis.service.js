const redisClient = require('../config/redis.js');

const RedisService = {
  set: async (key, value, ttlInSeconds = 300) => {
    try {
      await redisClient.set(key, value, { EX: ttlInSeconds });
    } catch (err) {
      console.error(`Redis SET error: ${err.message}`);
      throw err;
    }
  },

  get: async (key) => {
    try {
      return await redisClient.get(key);
    } catch (err) {
      console.error(`Redis GET error: ${err.message}`);
      throw err;
    }
  },

  del: async (key) => {
    try {
      await redisClient.del(key);
    } catch (err) {
      console.error(`Redis DEL error: ${err.message}`);
      throw err;
    }
  },
  exists: async (key) => {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (err) {
      console.error(`Redis EXISTS error: ${err.message}`);
      throw err;
    }
  },

  setObject: async (key, value, ttlInSeconds = 300) => {
    try {
      await redisClient.set(key, JSON.stringify(value), { EX: ttlInSeconds });
    } catch (err) {
      console.error(`Redis SET OBJECT error: ${err.message}`);
      throw err;
    }
  },

  getObject: async (key) => {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error(`Redis GET OBJECT error: ${err.message}`);
      throw err;
    }
  },

  getOrSet: async (key, fetchFn, ttlInSeconds = 300) => {
    try {
      const cachedData = await RedisService.getObject(key);
      if (cachedData) return cachedData;

      const freshData = await fetchFn();
      if (freshData) {
        await RedisService.setObject(key, freshData, ttlInSeconds);
      }
      return freshData;
    } catch (err) {
      console.error(`Redis GET_OR_SET error: ${err.message}`);
      throw err;
    }
  }
};

module.exports = RedisService;
