import env from '../config/env.js';

import { Queue } from 'bullmq';
import { connectRedis } from '../config/redisClient.js';

const queues = new Map();

export async function registerQueue(queueName, queueOptions = {}) {
  if (queues.has(queueName)) {
    return queues.get(queueName);
  }

  const connection = await connectRedis();

  const queue = new Queue(queueName, {
    connection,
    defaultJobOptions: {
        attempts: queueOptions.attempts ?? env.defaultJobAttempts,
        backoff: {
            type: 'exponential',
            delay: queueOptions.backoffDelayMs ?? env.defaultBackoffDelayMs
        },

        removeOnComplete: queueOptions.removeOnComplete ?? {count : 100},

        removeOnFail: queueOptions.removeOnFail ?? false
    }
  });

  queues.set(queueName, queue);
  console.log(`[queue] registered "${queueName}"`);
  return queue;

}

export function getQueue(queueName) {
  const queue = queues.get(queueName);
  if (!queue) {
    throw new Error(`Queue "${queueName}" is not registered. Call registerQueue("${queueName}") first.`);
  }
  return queue;
}