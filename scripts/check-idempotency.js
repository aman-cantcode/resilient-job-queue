import { markIfFirstAttempt } from '../src/core/idempotency.js';

const testKey = `demo:test-key:${Date.now()}`;
const first = await markIfFirstAttempt(testKey);
const second = await markIfFirstAttempt(testKey);

console.log('first call  (expect true) :', first);
console.log('second call (expect false):', second);
process.exit(0);
