import { getQueue } from './queueRegistry.js';

export async function enqueueJob(queueName, jobName, data, options = {}) {
    const queue = getQueue(queueName); // unregistered queue = programmer error, let it throw

    try {
        const job = await queue.add(jobName, data, options);
        console.log(`[enqueue] queue="${queueName}" job="${jobName}" id=${job.id}`);
        return job;
    } catch (err) {
        console.error(`[enqueue] failed queue="${queueName}" job="${jobName}":`, err.message);
        throw err;
    }
}