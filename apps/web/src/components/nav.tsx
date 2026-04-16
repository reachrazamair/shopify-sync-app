'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/orders', label: 'Orders' },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
  }

  return (
    <header className="border-b bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-14 items-center gap-6">
        <span className="font-semibold text-sm">Shopify Order Sync</span>
        <nav className="flex gap-4 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-sm transition-colors hover:text-foreground',
                pathname === item.href
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
