import { env } from './env.js';
import {createClient} from 'redis';
import {createNodeRedisClient} from 'bullmq';

const rawClient = createClient({url: env.redisUrl}); // one raw node-redis client for the whole process — Queue and Worker
// instances will both reuse the same wrapped connection, not create their own

rawClient.on('error', (err) => console.log('Redis Client Error : ', err.message));


let wrappedConnection = null;


// connects the client (once) and returns the BullMQ-compatible wrapped
// connection. safe to call this from multiple files — it won't reconnect
// if we're already connected.
export async function connectRedis() {
  if (!rawClient.isOpen) {
    await rawClient.connect();
    console.log(`[redis] connected → ${env.redisUrl}`);
  }

  if (!wrappedConnection) {
    wrappedConnection = createNodeRedisClient(rawClient);
  }

  return wrappedConnection;
}

