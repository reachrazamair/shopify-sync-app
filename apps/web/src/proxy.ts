import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

function verifySession(sessionCookie: string | undefined): boolean {
  if (!sessionCookie) return false;

  const secret = process.env['SESSION_SECRET'];
  if (!secret) return false;

  // Cookie format: "timestamp.hmac"
  const [timestamp, hmac] = sessionCookie.split('.');
  if (!timestamp || !hmac) return false;

  // Check session is not older than 24 hours
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Date.now() - ts > 86_400_000) return false;

  const expected = createHmac('sha256', secret).update(timestamp).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(hmac));
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and its API route without auth
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const session = request.cookies.get('session')?.value;

  if (!verifySession(session)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
