const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * shutdownWorker — close a worker gracefully: stop taking new jobs,
 * wait for whatever's active to finish, then close connections. Falls
 * back to a force-close if it takes too long — a stalled job is an
 * acceptable outcome (idempotency covers it); a process that never
 * exits on deploy is not.
 *
 * Deliberately does NOT touch process signals itself — a reusable
 * library shouldn't silently claim SIGINT/SIGTERM; the host
 * application decides when and in what order to close things down.
 */
export async function shutdownWorker(worker, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  console.log(`[shutdown] closing worker gracefully (timeout ${timeoutMs}ms)...`);

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
