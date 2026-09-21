const DEFAULT_TIMEOUT_MS = 10_000;

export async function shutdownWorker(worker, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  console.log(`[shutDelayed jobs → Run after a delay.

Concurrency → Process multiple jobs at once.

Priority → Important jobs first.

down] closing worker gracefully (timeout ${timeoutMs}ms)...`);

  const graceful = worker.close().then(() => 'closed');
  const timedOut = new Promise((resolve) => setTimeout(resolve, timeoutMs, 'timeout'));

  const result = await Promise.race([graceful, timedOut]);

  if (result === 'timeout') {
    console.warn('[shutdown] timed out waiting — forcing close (active job may stall)');
    await worker.close(true);
  } else {
    console.log('[shutdown] closed cleanly, nothing left running');
  }
}
