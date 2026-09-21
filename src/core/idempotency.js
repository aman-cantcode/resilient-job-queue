import { getRawClient } from '../config/redisClient.js';

const DEFAULT_TTL_SECONDS = 60 * 60; // covers any realistic stall/retry window

/**
 * markIfFirstAttempt — atomic "have I done this before?" check.
 * Returns true the first time a given key is seen, false every time
 * after — using SET...NX so the check-and-claim can't race (two
 * workers can't both see "not done yet" and both proceed).
 */
export async function markIfFirstAttempt(key, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const client = await getRawClient();
  const result = await client.set(`idempotency:${key}`, '1', {
    NX: true,
    EX: ttlSeconds,
  });
  return result === 'OK';
}
