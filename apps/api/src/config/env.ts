import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  DATABASE_URL: z.string().min(1),

  SHOPIFY_SHOP_DOMAIN: z.string().min(1),
  SHOPIFY_ADMIN_API_TOKEN: z.string().min(1),
  SHOPIFY_WEBHOOK_SECRET: z.string().min(1),
  SHOPIFY_API_VERSION: z.string().default('2024-01'),

  TEMPORAL_ADDRESS: z.string().default('localhost:7233'),
  TEMPORAL_NAMESPACE: z.string().default('default'),
  TEMPORAL_TASK_QUEUE: z.string().default('shopify-order-sync'),
  TEMPORAL_TLS_DISABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  TEMPORAL_TLS_CERT: z.string().optional(),
  TEMPORAL_TLS_KEY: z.string().optional(),

  API_KEY: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
