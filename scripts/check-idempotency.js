// deterministic proof the guard works: call it twice for the same key.
// the key includes the current timestamp so this script is safe to
// re-run anytime — a fixed key would still be marked "seen" in Redis
// from the last run (up to the 1-hour TTL) and wrongly report false
// twice instead of true-then-false.
import { markIfFirstAttempt } from '../src/core/idempotency.js';

const testKey = `demo:test-key:${Date.now()}`;
const first = await markIfFirstAttempt(testKey);
const second = await markIfFirstAttempt(testKey);

console.log('first call  (expect true) :', first);
console.log('second call (expect false):', second);
process.exit(0);
