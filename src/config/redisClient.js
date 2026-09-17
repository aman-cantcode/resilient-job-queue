import { env } from './env.js';
import {createClient} from 'redis';
import {createNodeRedisClient} from 'bullmq';

const rawClient = createClient({url: env.redisUrl}); 

rawClient.on('error', (err) => console.log('Redis Client Error : ', err.message)); //not optional


async function ensureConnected() {
  if(!rawClient.isOpen) {
    await rawClient.connect();
    console.log(`[redis] connected → ${env.redisUrl}`);
  }
}

// one connection — Queue and Worker instances will both reuse the same wrapped connection, not create their own
let wrappedConnection = null; 

export async function connectRedis() {

  await ensureConnected();

  if (!wrappedConnection) {
    wrappedConnection = createNodeRedisClient(rawClient);
  }

  return wrappedConnection;
}

export async function getRawClient() {
  await ensureConnected();

  return rawClient;
}
