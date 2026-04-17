import { Worker, NativeConnection } from '@temporalio/worker';
import { env } from './src/config/env.js';
import * as activities from './src/temporal/activities/index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  const connection = env.TEMPORAL_TLS_DISABLED
    ? await NativeConnection.connect({ address: env.TEMPORAL_ADDRESS })
    : await NativeConnection.connect({
        address: env.TEMPORAL_ADDRESS,
        tls: env.TEMPORAL_API_KEY
          ? true
          : {
              clientCertPair: {
                crt: Buffer.from(env.TEMPORAL_TLS_CERT ?? '', 'base64'),
                key: Buffer.from(env.TEMPORAL_TLS_KEY ?? '', 'base64'),
              },
            },
        ...(env.TEMPORAL_API_KEY ? { apiKey: env.TEMPORAL_API_KEY } : {}),
      });

  const worker = await Worker.create({
    connection,
    namespace: env.TEMPORAL_NAMESPACE,
    taskQueue: env.TEMPORAL_TASK_QUEUE,
    // Use .ts in dev (tsx), .js in production (compiled)
    workflowsPath: join(
      __dirname,
      env.NODE_ENV === 'production'
        ? './src/temporal/workflows/orderSync.js'
        : './src/temporal/workflows/orderSync.ts',
    ),
    activities,
  });

  console.log(
    `🚀 Temporal worker started | queue: ${env.TEMPORAL_TASK_QUEUE} | namespace: ${env.TEMPORAL_NAMESPACE}`,
  );

  await worker.run();
}

run().catch((err) => {
  console.error('Worker failed:', err);
  process.exit(1);
});
