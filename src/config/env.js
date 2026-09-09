import dotenv from 'dotenv';
dotenv.config();

//ntg else will read from .env file, singel source of truth
export const env = {
    redisUrl : process.env.REDIS_URL || 'redis://localhost:6379',
}