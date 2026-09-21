// producer-side dedup: adding a job with the same jobId twice
import { registerQueue } from '../src/core/queueRegistry.js';
import { enqueueJob } from '../src/core/producer.js';

await registerQueue('demo-queue');
const first = await enqueueJob('demo-queue', 'order-job', { orderId: 'ORD-1' }, { jobId: 'order-ORD-1' });
const second = await enqueueJob('demo-queue', 'order-job', { orderId: 'ORD-1' }, { jobId: 'order-ORD-1' });

console.log('same underlying job:', first.id === second.id, `(id: ${first.id})`);
process.exit(0);
