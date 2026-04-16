import { createHmac, timingSafeEqual } from 'crypto';

export function verifyShopifyHmac(rawBody: Buffer, signature: string, secret: string): boolean {
  const digest = createHmac('sha256', secret).update(rawBody).digest('base64');
  const trusted = Buffer.from(digest);
  const received = Buffer.from(signature);

  if (trusted.length !== received.length) return false;

  return timingSafeEqual(trusted, received);
}
