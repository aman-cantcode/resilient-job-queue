// integration tests — these exercise the real thing against a real
// Redis, so they need: redis running, `npm install` done, and to be
// run from the project root. NOT safe to run against a Redis instance
// you care about keeping clean — it registers its own test-* queues,
// but nothing here flushes Redis, so leftover test data is harmless
// but will accumulate over repeated runs.
//
// usage: node tests/run-integration-tests.js   (or: npm test)

import assert from 'node:assert/strict';
import { registerQueue } from '../src/core/queueRegistry.js';
import { enqueueJob } from '../src/core/producer.js';
import { createWorker } from '../src/core/workerFactory.js';
import { shutdownWorker } from '../src/core/shutdown.js';
import { scheduleDelayedJob, scheduleRepeatingJob, removeRepeatingJob } from '../src/core/scheduler.js';
import { listFailedJobs, retryFailedJob } from '../src/core/deadLetter.js';
import { markIfFirstAttempt } from '../src/core/idempotency.js';
import { getRawClient } from '../src/config/redisClient.js';

const results = [];

async function test(name, fn) {
  const start = Date.now();
  try {
    await fn();
    const ms = Date.now() - start;
    results.push({ name, pass: true, ms });
    console.log(`✓ PASS  ${name} (${ms}ms)`);
  } catch (err) {
    const ms = Date.now() - start;
    results.push({ name, pass: false, ms, error: err.message });
    console.log(`✗ FAIL  ${name} (${ms}ms)`);
    console.log(`        ${err.message}`);
  }
}

// waits for a specific job to reach a TERMINAL outcome on a worker:
// 'completed', or 'failed' with retries exhausted (our dead-letter
// point). Ignores intermediate failed-but-will-retry events.
function waitForOutcome(worker, jobId, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out waiting for job ${jobId} to reach a terminal state`)),
      timeoutMs
    );

    worker.on('completed', (job) => {
      if (String(job.id) === String(jobId)) {
        clearTimeout(timer);
        resolve({ outcome: 'completed', job });
      }
    });

    worker.on('failed', (job, err) => {
      if (job && String(job.id) === String(jobId)) {
        const exhausted = job.attemptsMade >= (job.opts?.attempts ?? Infinity);
        if (exhausted) {
          clearTimeout(timer);
          resolve({ outcome: 'dead-lettered', job, err });
        }
        // else: will retry — keep waiting for the eventual outcome
      }
    });
  });
}

// ---------------------------------------------------------------
await test('redis connection is alive', async () => {
  const client = await getRawClient();
  const pong = await client.ping();
  assert.equal(pong, 'PONG');
});

// ---------------------------------------------------------------
await test('registerQueue is idempotent — same name returns the same queue instance', async () => {
  const a = await registerQueue('test-registry');
  const b = await registerQueue('test-registry');
  assert.equal(a, b);
});

// ---------------------------------------------------------------
await test('enqueueJob throws a clear error for an unregistered queue', async () => {
  await assert.rejects(
    () => enqueueJob('test-never-registered', 'job', {}),
    /is not registered/
  );
});

// ---------------------------------------------------------------
await test('a normal job is picked up and completes', async () => {
  await registerQueue('test-basic');
  const worker = await createWorker('test-basic', async () => 'ok');
  const job = await enqueueJob('test-basic', 'basic-job', {});

  const result = await waitForOutcome(worker, job.id);
  assert.equal(result.outcome, 'completed');

  await worker.close();
});

// ---------------------------------------------------------------
await test('a job that fails twice retries with backoff, then succeeds', async () => {
  await registerQueue('test-retry', { attempts: 3, backoffDelayMs: 200 });
  const worker = await createWorker('test-retry', async (job) => {
    if (job.attemptsMade < 2) {
      throw new Error('simulated failure');
    }
    return 'ok';
  });

  const start = Date.now();
  const job = await enqueueJob('test-retry', 'flaky-job', {});
  const result = await waitForOutcome(worker, job.id);
  const elapsed = Date.now() - start;

  assert.equal(result.outcome, 'completed');
  assert.equal(result.job.attemptsMade, 3);
  // backoff waits should be ~200ms + ~400ms = ~600ms minimum before success
  assert.ok(elapsed >= 500, `expected backoff delay, but only took ${elapsed}ms`);

  await worker.close();
});

// ---------------------------------------------------------------
await test('a job that always fails gets dead-lettered and stays inspectable', async () => {
  await registerQueue('test-deadletter', { attempts: 2, backoffDelayMs: 100 });
  const worker = await createWorker('test-deadletter', async () => {
    throw new Error('always fails');
  });

  const job = await enqueueJob('test-deadletter', 'doomed-job', { note: 'will die' });
  const result = await waitForOutcome(worker, job.id);

  assert.equal(result.outcome, 'dead-lettered');
  assert.equal(result.job.attemptsMade, 2);

  const failed = await listFailedJobs('test-deadletter');
  const found = failed.find((f) => String(f.id) === String(job.id));
  assert.ok(found, 'expected the exhausted job to appear in listFailedJobs()');
  assert.equal(found.failedReason, 'always fails');

  await worker.close();
});

// ---------------------------------------------------------------
await test('retryFailedJob replays a dead-lettered job so it can succeed', async () => {
  await registerQueue('test-retry-replay', { attempts: 1, backoffDelayMs: 100 });
  let shouldFail = true;
  const worker = await createWorker('test-retry-replay', async () => {
    if (shouldFail) throw new Error('first pass fails on purpose');
    return 'ok';
  });

  const job = await enqueueJob('test-retry-replay', 'replay-job', {});
  const first = await waitForOutcome(worker, job.id);
  assert.equal(first.outcome, 'dead-lettered');

  shouldFail = false; // simulate "we fixed the underlying issue"
  await retryFailedJob('test-retry-replay', job.id);
  const second = await waitForOutcome(worker, job.id);
  assert.equal(second.outcome, 'completed');

  await worker.close();
});

// ---------------------------------------------------------------
await test('idempotency guard: first call true, second call false', async () => {
  const key = `test:idempotency:${Date.now()}`;
  const first = await markIfFirstAttempt(key);
  const second = await markIfFirstAttempt(key);
  assert.equal(first, true);
  assert.equal(second, false);
});

// ---------------------------------------------------------------
await test('producer-side dedup: same jobId does not create a second job', async () => {
  await registerQueue('test-dedup');
  const jobId = `dedup-${Date.now()}`;
  const first = await enqueueJob('test-dedup', 'order-job', { orderId: 1 }, { jobId });
  const second = await enqueueJob('test-dedup', 'order-job', { orderId: 1 }, { jobId });
  assert.equal(first.id, second.id);
});

// ---------------------------------------------------------------
await test('a delayed job does not run before its delay elapses', async () => {
  await registerQueue('test-delayed');
  const worker = await createWorker('test-delayed', async () => 'ok');

  const delayMs = 1500;
  const start = Date.now();
  const job = await scheduleDelayedJob('test-delayed', 'delayed-job', {}, delayMs);
  const result = await waitForOutcome(worker, job.id);
  const elapsed = Date.now() - start;

  assert.equal(result.outcome, 'completed');
  assert.ok(elapsed >= delayMs - 100, `expected to wait ~${delayMs}ms, only took ${elapsed}ms`);

  await worker.close();
});

// ---------------------------------------------------------------
await test('a repeating scheduler ticks on its own, then stops after removal', async () => {
  await registerQueue('test-repeating');
  let completions = 0;
  const worker = await createWorker('test-repeating', async () => {
    completions += 1;
    return 'tick';
  });

  await scheduleRepeatingJob('test-repeating', 'test-heartbeat', { every: 1000 }, 'heartbeat', {});

  // let it tick a few times (immediate first tick + at least one interval)
  await new Promise((r) => setTimeout(r, 2500));
  const countBeforeRemoval = completions;
  assert.ok(countBeforeRemoval >= 2, `expected at least 2 ticks, got ${countBeforeRemoval}`);

  await removeRepeatingJob('test-repeating', 'test-heartbeat');

  // wait past another interval and confirm no new ticks arrived
  await new Promise((r) => setTimeout(r, 1500));
  assert.equal(completions, countBeforeRemoval, 'expected ticking to stop after removal');

  await worker.close();
});

// ---------------------------------------------------------------
await test('concurrency: 3 slow jobs at concurrency=3 run overlapped, not serially', async () => {
  await registerQueue('test-concurrency');
  const worker = await createWorker(
    'test-concurrency',
    async () => new Promise((r) => setTimeout(r, 1000)),
    { concurrency: 3 }
  );

  const start = Date.now();
  const jobs = await Promise.all([
    enqueueJob('test-concurrency', 'job', {}),
    enqueueJob('test-concurrency', 'job', {}),
    enqueueJob('test-concurrency', 'job', {}),
  ]);
  await Promise.all(jobs.map((j) => waitForOutcome(worker, j.id)));
  const elapsed = Date.now() - start;

  // serial would take ~3000ms; overlapped should land close to ~1000ms
  assert.ok(elapsed < 2000, `expected overlapped processing (<2000ms), took ${elapsed}ms`);

  await worker.close();
});

// ---------------------------------------------------------------
await test('graceful shutdown waits for an active job to finish before closing', async () => {
  await registerQueue('test-shutdown');
  const worker = await createWorker(
    'test-shutdown',
    async () => new Promise((r) => setTimeout(r, 1500)),
    { concurrency: 1 }
  );

  const job = await enqueueJob('test-shutdown', 'slow-job', {});
  await new Promise((resolve) => worker.once('active', resolve)); // wait until it actually starts

  const completed = waitForOutcome(worker, job.id, 6000);
  await Promise.all([shutdownWorker(worker, { timeoutMs: 5000 }), completed]);
  const result = await completed;
  assert.equal(result.outcome, 'completed');
});

// ---------------------------------------------------------------
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} passed`);
if (passed !== results.length) process.exitCode = 1;
process.exit(process.exitCode ?? 0);
