import { getQueue } from './queueRegistry.js';

export async function listFailedJobs(queueName, limit = 20) {
  const queue = getQueue(queueName);
  const jobs = await queue.getFailed(0, limit - 1);

  return jobs.map((job) => ({
    id: job.id,
    name: job.name,
    data: job.data,
    attemptsMade: job.attemptsMade,
    maxAttempts: job.opts.attempts,
    failedReason: job.failedReason,
    finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
  }));
}

export async function retryFailedJob(queueName, jobId) {
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);
  if (!job) throw new Error(`job ${jobId} not found in queue "${queueName}"`);

  await job.retry('failed');
  console.log(`[dead-letter] retried job id=${jobId}`);
}
