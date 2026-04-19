'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#09090b', color: '#fafafa', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ maxWidth: '360px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                Server error
              </p>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Something went wrong</h1>
              <p style={{ fontSize: '0.875rem', color: '#a1a1aa', margin: 0 }}>
                A critical error occurred. Please try again or return to login.
              </p>
              {error.digest && (
                <p style={{ fontSize: '0.75rem', color: '#52525b', fontFamily: 'monospace', margin: 0 }}>
                  Error ID: {error.digest}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={reset}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', background: '#fafafa', color: '#09090b', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
              >
                Try again
              </button>
              <a
                href="/login"
                style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', background: 'transparent', color: '#fafafa', border: '1px solid #27272a', cursor: 'pointer', fontSize: '0.875rem', textAlign: 'center', textDecoration: 'none' }}
              >
                Back to login
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
