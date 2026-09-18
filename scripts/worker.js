import { createWorker } from '../src/core/workerFactory.js';

await createWorker('demo-queue', async (job) => {
  const failTimes = job.data.failTimes ?? 0;

  // demo-only chaos logic
  if (job.attemptsMade < failTimes) {
    throw new Error(`simulated failure (attempt ${job.attemptsMade + 1}/${failTimes})`);
  }

  console.log(`[process] succeeded id=${job.id} data=`, job.data);
  return { processedAt: new Date().toISOString() };
});