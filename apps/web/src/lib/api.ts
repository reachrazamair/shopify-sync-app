const API_URL =
  process.env['INTERNAL_API_URL'] ??
  process.env['NEXT_PUBLIC_API_URL'] ??
  'http://localhost:3001';

const API_KEY = process.env['API_KEY'] ?? '';

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      'x-api-key': API_KEY,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
