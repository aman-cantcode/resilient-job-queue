import {connectRedis} from '../src/config/redisClient.js';

const check = await connectRedis();

console.log('Redis connection check successful');

