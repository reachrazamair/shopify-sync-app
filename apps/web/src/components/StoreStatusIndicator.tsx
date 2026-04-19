'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { StoreConnectionStatus } from '@repo/types';

const WEBHOOK_URL =
  (process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001') +
  '/webhooks/shopify/orders';

function WebhookUrlRow() {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(WEBHOOK_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">Webhook delivery URL</span>
      <div className="flex items-center gap-1.5 rounded-md border bg-muted px-2 py-1.5">
        <span className="text-xs font-mono flex-1 truncate text-foreground" title={WEBHOOK_URL}>
          {WEBHOOK_URL}
        </span>
        <button
          onClick={copy}
          type="button"
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? '✓' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

interface Props {
  initialStatus: StoreConnectionStatus;
}

export function StoreStatusIndicator({ initialStatus }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ shopDomain: '', adminApiToken: '', webhookSecret: '' });
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleConnect(e: React.SyntheticEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/store/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json() as { error: string };
        setError(data.error ?? 'Failed to connect store');
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/store/disconnect', { method: 'DELETE' });
      if (!res.ok) {
        setError('Failed to disconnect — please try again');
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  const connected = initialStatus.connected;

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={open}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              connected ? 'bg-green-400' : 'bg-amber-400'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              connected ? 'bg-green-500' : 'bg-amber-500'
            }`}
          />
        </span>
        <span className="hidden sm:inline">
          {connected ? initialStatus.shopDomain : 'Not connected'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border bg-card shadow-lg z-50">
          {connected ? (
            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{initialStatus.shopDomain}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Connected
                </span>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Token</span>
                  <span className="font-mono">{initialStatus.tokenRedacted}</span>
                </div>
                <div className="flex justify-between">
                  <span>Webhook</span>
                  <span className={initialStatus.webhookRegistered ? 'text-green-600 dark:text-green-400' : 'text-amber-600'}>
                    {initialStatus.webhookRegistered ? 'Active' : 'Not registered'}
                  </span>
                </div>
                {initialStatus.connectedAt && (
                  <div className="flex justify-between">
                    <span>Since</span>
                    <span>
                      {new Date(initialStatus.connectedAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>

              <WebhookUrlRow />

              {error && <p className="text-xs text-destructive">{error}</p>}

              <button
                onClick={() => void handleDisconnect()}
                disabled={loading}
                className="w-full text-sm px-3 py-1.5 rounded-md border border-destructive text-destructive hover:bg-destructive hover:text-white transition-colors disabled:opacity-50"
              >
                {loading ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleConnect(e)} className="p-4 flex flex-col gap-3">
              <p className="font-medium text-sm">Connect Shopify Store</p>

              {/* Webhook URL — shown first so user can copy before filling the form */}
              <WebhookUrlRow />

              <div className="border-t pt-3 flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">
                    Store Domain <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center rounded-md border bg-background focus-within:ring-1 focus-within:ring-ring overflow-hidden">
                    <span className="text-sm text-muted-foreground px-2 border-r bg-muted select-none whitespace-nowrap py-1.5">
                      https://
                    </span>
                    <input
                      type="text"
                      placeholder="my-store.myshopify.com"
                      value={form.shopDomain}
                      onChange={(e) => setForm((f) => ({ ...f, shopDomain: e.target.value }))}
                      required
                      className="text-sm px-2 py-1.5 flex-1 bg-background focus:outline-none min-w-0"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">
                    Admin API Token <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="shpat_••••••••"
                    value={form.adminApiToken}
                    onChange={(e) => setForm((f) => ({ ...f, adminApiToken: e.target.value }))}
                    required
                    className="text-sm px-3 py-1.5 rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">
                    Webhook Secret <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Signing secret from Shopify"
                    value={form.webhookSecret}
                    onChange={(e) => setForm((f) => ({ ...f, webhookSecret: e.target.value }))}
                    required
                    className="text-sm px-3 py-1.5 rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                {error && <p className="text-xs text-destructive">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Connecting...' : 'Connect Store'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
