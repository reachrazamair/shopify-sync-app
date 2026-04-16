import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';

function createSession(secret: string): string {
  const timestamp = Date.now().toString();
  const hmac = createHmac('sha256', secret).update(timestamp).digest('hex');
  return `${timestamp}.${hmac}`;
}

export async function POST(request: Request) {
  const body = await request.json() as { password?: string };
  const { password } = body;

  const dashboardPassword = process.env['DASHBOARD_PASSWORD'];
  const sessionSecret = process.env['SESSION_SECRET'];

  if (!dashboardPassword || !sessionSecret) {
    return Response.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (!password) {
    return Response.json({ error: 'Password required' }, { status: 400 });
  }

  const expected = Buffer.from(dashboardPassword);
  const provided = Buffer.from(password);

  const isValid =
    expected.length === provided.length && timingSafeEqual(expected, provided);

  if (!isValid) {
    return Response.json({ error: 'Invalid password' }, { status: 401 });
  }

  const sessionToken = createSession(sessionSecret);
  const cookieStore = await cookies();

  cookieStore.set('session', sessionToken, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    maxAge: 86400, // 24 hours
    path: '/',
  });

  return Response.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  return Response.json({ ok: true });
}
