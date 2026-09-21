import { registerQueue } from '../src/core/queueRegistry.js';
import { scheduleRepeatingJob } from '../src/core/scheduler.js';

await registerQueue('demo-queue');
await scheduleRepeatingJob('demo-queue', 'heartbeat-scheduler', { every: 5000 }, 'heartbeat-job', { note: 'tick' });
console.log('scheduler registered — it will tick every 5s until removed');
process.exit(0);
