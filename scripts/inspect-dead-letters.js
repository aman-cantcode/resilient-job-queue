import { registerQueue } from '../src/core/queueRegistry.js';
import { listFailedJobs } from '../src/core/deadLetter.js';

await registerQueue('demo-queue');
const failed = await listFailedJobs('demo-queue');

if (failed.length === 0) {
  console.log('no dead-lettered jobs.');
} else {
  console.log(`${failed.length} dead-lettered job(s):\n`);
  for (const job of failed) {
    console.log(`id=${job.id} name="${job.name}" attempts=${job.attemptsMade}/${job.maxAttempts}`);
    console.log(`  data:`, job.data);
    console.log(`  reason: ${job.failedReason}`);
    console.log(`  failed at: ${job.finishedOn}\n`);
  }
}

process.exit(0);
