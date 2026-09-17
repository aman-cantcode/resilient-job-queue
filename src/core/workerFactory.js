import { Worker, Worker } from "bullmq";
import { connectRedis } from "../config/redisClient.js";
import { env } from '../config/env.js';

export async function createWorker(queueName, processor, options = {}) {
    const connection = await connectRedis();

    const worker = new Worker(queueName, processor, {
        connection: connection,
        concurrency: options.concurrency ?? env.defaultConcurrency,
        ...(options.lockDuration ? { lockDuration: options.lockDuration } : {}),
        ...(options.stalledInterval ? { stalledInterval: options.stalledInterval } : {})
    });

    worker.on('active', (job) => {
        console.log(`[worker:${queueName}] ACTIVE    id=${job.id} name="${job.name}" attempt=${job.attemptsMade + 1}`);
    });

    worker.on('completed', (job) => {
        console.log(`[worker:${queueName}] COMPLETED id=${job.id} name="${job.name}"`);
    });

    worker.on('failed', (job, err) => {
        const attempts = job?.attemptsMade ?? 0;
        const max = job?.opts?.attempts ?? '?';
        const exhausted = attempts >= max;
        const label = exhausted ? 'DEAD-LETTERED' : 'FAILED (will retry)';
        console.log(`[worker:${queueName}] ${label} id=${job?.id} attempt=${attempts}/${max} reason="${err.message}"`);
    });

    worker.on('stalled', (jobId) => {
        console.log(`[worker:${queueName}] STALLED   id=${jobId} — lock expired, job will be reprocessed`);
    });

    worker.on('error', (err) => {
        // connection-level problems, not job failures — different thing
        console.error(`[worker:${queueName}] WORKER ERROR:`, err.message);
    });

    console.log(`[worker:${queueName}] listening (concurrency=${worker.opts.concurrency})`);
    return worker;
}
