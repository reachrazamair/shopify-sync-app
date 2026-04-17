import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

async function verifySession(sessionCookie: string | undefined): Promise<boolean> {
  if (!sessionCookie) return false;

  const secret = process.env['SESSION_SECRET'];
  if (!secret) return false;

  // Cookie format: "timestamp.hmac"
  const [timestamp, hmac] = sessionCookie.split('.');
  if (!timestamp || !hmac) return false;

  // Check session is not older than 24 hours
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Date.now() - ts > 86_400_000) return false;

  // Use Web Crypto API (Edge Runtime compatible)
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(timestamp));
  const expected = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return expected === hmac;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and its API route without auth
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const session = request.cookies.get('session')?.value;

  if (!await verifySession(session)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
