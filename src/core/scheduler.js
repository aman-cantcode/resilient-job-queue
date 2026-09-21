import { getQueue } from './queueRegistry.js';

//delayed job
export async function scheduleDelayedJob(queueName, jobName, data, delayMs, options = {}) {
  const queue = getQueue(queueName);
  const job = await queue.add(jobName, data, { ...options, delay: delayMs });
  console.log(`[schedule] delayed job queue="${queueName}" job="${jobName}" id=${job.id} in ${delayMs}ms`);
  return job;
}

//every day alarm
export async function scheduleRepeatingJob(queueName, schedulerId, repeatOpts, jobName, data = {}) {
  const queue = getQueue(queueName);
  await queue.upsertJobScheduler(schedulerId, repeatOpts, { name: jobName, data });
  console.log(`[schedule] repeating job registered scheduler="${schedulerId}" queue="${queueName}"`);
}

//stop the scheduler
export async function removeRepeatingJob(queueName, schedulerId) {
  const queue = getQueue(queueName);
  const removed = await queue.removeJobScheduler(schedulerId);
  console.log(`[schedule] scheduler="${schedulerId}" removed=${!!removed}`);
  return removed;
}
