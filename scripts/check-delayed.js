import { registerQueue } from '../src/core/queueRegistry.js';
import { scheduleDelayedJob } from '../src/core/scheduler.js';

await registerQueue('demo-queue');
await scheduleDelayedJob('demo-queue', 'delayed-job', { note: 'ran after a delay' }, 5000);
process.exit(0);
