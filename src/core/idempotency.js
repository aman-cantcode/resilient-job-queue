import { getRawClient } from '../config/redisClient.js';

const DEFAULT_TTL_SECONDS = 60 * 60;

export async function markIfFirstAttempt(key, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const client = await getRawClient();
  const result = await client.set(`idempotency:${key}`, '1', {
    NX: true,           //Set only if the key does not already exist
    EX: ttlSeconds,     //expire
  });
  return result === 'OK';
}
