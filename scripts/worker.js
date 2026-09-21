import { createWorker } from '../src/core/workerFactory.js';
import { shutdownWorker } from '../src/core/shutdown.js';
import { markIfFirstAttempt } from '../src/core/idempotency.js';
import { getArg } from './utils/cliArgs.js';

const concurrency = Number(getArg('concurrency', 1));

const worker = await createWorker('demo-queue', async (job) => {
  const failTimes = job.data.failTimes ?? 0;

  // demo-only chaos logic — lives here, not in the core package
  if (job.attemptsMade < failTimes) {
    throw new Error(`simulated failure (attempt ${job.attemptsMade + 1}/${failTimes})`);
  }

  // optional artificial delay — gives you a window to Ctrl+C mid-job
  // if you want to watch graceful shutdown (or a real stall) happen
  if (job.data.sleepMs) {
    await new Promise((resolve) => setTimeout(resolve, job.data.sleepMs));
  }

  // the actual side effect, guarded so it only ever truly runs once
  // per job — even if this function gets invoked again after a stall
  const isFirstAttempt = await markIfFirstAttempt(`demo-queue:${job.id}`);
  if (!isFirstAttempt) {
    console.log(`[process] SKIPPED (duplicate) id=${job.id} — idempotency guard caught a repeat run`);
    return { skipped: true };
  }

  console.log(`[process] doing real work for id=${job.id} data=`, job.data);
  return { processedAt: new Date().toISOString() };
}, { concurrency });

async function handleShutdown(signal) {
  console.log(`\n[worker] received ${signal}`);
  await shutdownWorker(worker);
  process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));   // Ctrl+C
process.on('SIGTERM', () => handleShutdown('SIGTERM')); // e.g. container/orchestrator stop
