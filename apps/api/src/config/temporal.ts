import { Connection, Client } from '@temporalio/client';
import { env } from './env.js';

let _client: Client | null = null;

export async function getTemporalClient(): Promise<Client> {
  if (_client) return _client;

  const connection = env.TEMPORAL_TLS_DISABLED
    ? await Connection.connect({ address: env.TEMPORAL_ADDRESS })
    : await Connection.connect({
        address: env.TEMPORAL_ADDRESS,
        tls: {
          clientCertPair: {
            crt: Buffer.from(env.TEMPORAL_TLS_CERT ?? '', 'base64'),
            key: Buffer.from(env.TEMPORAL_TLS_KEY ?? '', 'base64'),
          },
        },
      });

  _client = new Client({ connection, namespace: env.TEMPORAL_NAMESPACE });
  return _client;
}
