'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function verifyAccess() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.replace('/');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, subscription_end')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'admin') {
          setAllowed(true);
          return;
        }

        const end = profile?.subscription_end ? new Date(profile.subscription_end).getTime() : 0;
        if (end > Date.now()) {
          setAllowed(true);
        } else {
          router.replace('/dashboard');
        }
      } catch {
        const cachedEnd = Number(localStorage.getItem('gce_pass_sub_end') || '0');
        if (cachedEnd > Date.now()) {
          setAllowed(true);
        } else {
          router.replace('/');
        }
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
