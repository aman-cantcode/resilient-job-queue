import { registerQueue } from '../src/core/queueRegistry.js';
import { enqueueJob } from '../src/core/producer.js';
import { getArg } from './utils/cliArgs.js';

//deliberately set
const failTimes = Number(getArg('fail-times', 0));
const sleepMs = Number(getArg('sleep-ms', 0));
const count = Number(getArg('count', 1));

await registerQueue('demo-queue');

for (let i = 0; i < count; i++) {
  await enqueueJob('demo-queue', 'flaky-job', { failTimes, sleepMs });
}

process.exit(0);
