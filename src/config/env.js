import dotenv from 'dotenv';
dotenv.config();

export const env = {
    redisUrl : process.env.REDIS_URL || 'redis://localhost:6379',
    defaultJobAttempts : Number(process.env.DEFAULT_JOB_ATTEMPTS) || 3,
    defaultBackoffDelayMs : Number(process.env.DEFAULT_BACKOFF_DELAY_MS) || 1000,
    defaultConcurrency : Number(process.env.DEFAULT_CONCURRENCY) || 1
}