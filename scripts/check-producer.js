import { registerQueue } from '../src/core/queueRegistry.js';
import { enqueueJob } from '../src/core/producer.js';
import { getArg } from './utils/cliArgs.js';

const failTimes = Number(getArg('fail-times', 0));

await registerQueue('demo-queue');
await enqueueJob('demo-queue', 'flaky-job', { failTimes });

process.exit(0);