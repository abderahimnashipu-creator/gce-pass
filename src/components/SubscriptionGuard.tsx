'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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

      try {
        const parsed = JSON.parse(raw);
        if (parsed.role === 'admin' || isSubscriptionActive(parsed.subscription_expires_at)) {
          setAllowed(true);
        } else {
          router.replace('/dashboard');
        }

        const { data } = await supabase
          .from('users')
          .select('id, phone_number, role, subscription_plan, subscription_expires_at')
          .eq('id', parsed.id)
          .single();

        if (data) {
          localStorage.setItem('gce_user', JSON.stringify(data));
          if (data.role === 'admin' || isSubscriptionActive(data.subscription_expires_at)) {
            setAllowed(true);
          } else {
            setAllowed(false);
            router.replace('/dashboard');
          }
        }
      } catch {
        // Keep offline cache decision if network fails
      } finally {
        setChecking(false);
      }
    }

    verifyAccess();
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
