# Resilient Job Queue

A production-style background job processing system built with Node.js, BullMQ, and Redis.

## Features

- Redis-backed durable jobs
- Automatic retries with exponential backoff
- Dead-letter job inspection and replay
- Delayed jobs
- Repeatable jobs
- Idempotent job processing
- Configurable worker concurrency
- Graceful worker shutdown
- Simple CLI-based demos
- Unit and integration tests

## How It Works

Jobs are added to Redis by a producer and processed by a worker.

```text
Producer
   |
   v
 Redis
   |
   v
 Worker
   |
   +----> Completed
   |
   +----> Failed --> Retry with backoff
                    |
                    +----> Dead Letter
```

Because jobs are stored in Redis before processing, they can survive application crashes.

## Quick Start

### Prerequisites

- Node.js 18+
- Redis

Start Redis and verify the connection:

```bash
redis-cli ping
```

Expected output:

```text
PONG
```

### Install

```bash
npm install
```

### Run the Demo

Start the worker in one terminal:

```bash
npm run worker
```

Start the demo in another terminal:

```bash
npm run demo
```

The demo shows normal jobs, retries, exponential backoff, and dead-lettered jobs.

## Testing

Run unit tests:

```bash
npm run test:unit
```

Run integration tests:

```bash
npm test
```

Integration tests require Redis to be running.

## Project Structure

```text
resilient-job-queue/
├── src/
│   ├── index.js
│   ├── config/
│   │   ├── env.js
│   │   └── redisClient.js
│   └── core/
│       ├── queueRegistry.js
│       ├── producer.js
│       ├── workerFactory.js
│       ├── scheduler.js
│       ├── deadLetter.js
│       ├── idempotency.js
│       └── shutdown.js
│
├── scripts/
│   ├── worker.js
│   ├── producer.js
│   ├── demo.js
│   └── check-*.js
│
└── tests/
    ├── run-unit-tests.js
    └── run-integration-tests.js
```

## Tech Stack

- Node.js
- BullMQ
- Redis
- JavaScript ES Modules

## Integration

The queue is designed to be used as a reusable component in other Node.js or Express applications.

A producer can add jobs from an application, while a separate worker process handles the jobs in the background.
