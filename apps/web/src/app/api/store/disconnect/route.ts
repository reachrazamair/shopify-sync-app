import { apiFetch } from '@/lib/api';

export async function DELETE() {
  try {
    await apiFetch('/api/store/disconnect', { method: 'DELETE' });
    return new Response(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to disconnect store';
    return Response.json({ error: message }, { status: 500 });
  }
}
