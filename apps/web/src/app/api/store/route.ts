import { apiFetch } from '@/lib/api';
import type { StoreConnectionStatus } from '@repo/types';

export async function GET() {
  try {
    const status = await apiFetch<StoreConnectionStatus>('/api/store');
    return Response.json(status);
  } catch {
    return Response.json({ connected: false, webhookRegistered: false });
  }
}
