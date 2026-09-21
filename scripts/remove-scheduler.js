import { registerQueue } from '../src/core/queueRegistry.js';
import { removeRepeatingJob } from '../src/core/scheduler.js';

await registerQueue('demo-queue');
await removeRepeatingJob('demo-queue', 'heartbeat-scheduler');
process.exit(0);
