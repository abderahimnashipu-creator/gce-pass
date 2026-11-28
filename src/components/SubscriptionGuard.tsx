'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isSubscriptionActive } from '@/lib/offlineCache';

export default function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function verifyAccess() {
      const raw = localStorage.getItem('gce_user');
      if (!raw) {
        router.replace('/');
        return;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(raw);
        if (!parsed?.id) throw new Error('Invalid session');
      } catch {
        localStorage.removeItem('gce_user');
        router.replace('/');
        return;
      }

      try {
        const res = await fetch('/api/verify-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: parsed.id }),
        });

        if (res.status === 404 || res.status === 400) {
          localStorage.removeItem('gce_user');
          router.replace('/');
          return;
        }

        if (res.ok) {
          const { user } = await res.json();
          if (user) {
            localStorage.setItem('gce_user', JSON.stringify(user));
            if (user.role === 'admin' || isSubscriptionActive(user.subscription_expires_at)) {
              setAllowed(true);
            } else {
              router.replace('/dashboard');
            }
            return;
          }
        }
      } catch {
        // Network offline: fall back to cached subscription check below
      }

      if (parsed.role === 'admin' || isSubscriptionActive(parsed.subscription_expires_at)) {
        setAllowed(true);
      } else {
        router.replace('/dashboard');
      }
    }

    verifyAccess().finally(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center p-6 text-sm">
        Verifying GCE Pass access...
      </div>
    );
  }

  return allowed ? <>{children}</> : null;
}
