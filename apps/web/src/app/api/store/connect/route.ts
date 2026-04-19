import { apiFetch } from '@/lib/api';

export async function POST(request: Request) {
  const body = await request.json() as { shopDomain: string; adminApiToken: string; webhookSecret: string };
  try {
    const result = await apiFetch('/api/store/connect', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return Response.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to connect store';
    const status = message.includes('422') ? 422 : 500;
    // Extract the JSON error message from the API error string if present
    const match = /API error \d+: (.+)/.exec(message);
    const errorBody = match ? JSON.parse(match[1]) as { error: string } : { error: message };
    return Response.json(errorBody, { status });
  }
}
