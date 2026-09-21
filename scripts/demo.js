import { registerQueue } from '../src/core/queueRegistry.js';
import { enqueueJob } from '../src/core/producer.js';
import { scheduleDelayedJob } from '../src/core/scheduler.js';
import { listFailedJobs } from '../src/core/deadLetter.js';

function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function announce(text) {
  console.log(`\n=== ${text} ===`);
}

await registerQueue('demo-queue');

announce('1) normal job — completes on the first try');
await enqueueJob('demo-queue', 'demo-normal', { scenario: 'normal' });
await pause(2000);

announce('2) flaky job — fails twice, then succeeds (watch the backoff gaps)');
await enqueueJob('demo-queue', 'demo-flaky', { failTimes: 2 });
await pause(6000); // covers both backoff waits + processing

announce('3) doomed job — exceeds its retry limit, gets dead-lettered');
await enqueueJob('demo-queue', 'demo-doomed', { failTimes: 10 });
await pause(4000);

announce('4) delayed job — arrives 4s from now, stays quiet until then');
await scheduleDelayedJob('demo-queue', 'demo-delayed', { scenario: 'delayed' }, 4000);
await pause(5000);

announce('5) dead-letter inspection — pulling the doomed job back out of redis');
const failed = await listFailedJobs('demo-queue');
for (const job of failed) {
  console.log(`  id=${job.id} name="${job.name}" reason="${job.failedReason}"`);
}

announce('demo complete — check the worker terminal for the full lifecycle log');
process.exit(0);
