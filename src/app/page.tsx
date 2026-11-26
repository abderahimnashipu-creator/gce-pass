'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getOrCreateDeviceId,
  hasDeviceUsedTrial,
  markDeviceTrialUsed,
} from '@/lib/deviceLock';
import { BookOpen, ShieldCheck, Smartphone, KeyRound } from 'lucide-react';

export default function AuthLandingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('gce_user');
    if (saved) {
      router.replace('/dashboard');
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const deviceId = getOrCreateDeviceId();
      const endpoint =
        mode === 'register' ? '/api/auth/register' : '/api/auth/login';

      const body =
        mode === 'register'
          ? {
              phone,
              pin,
              deviceId,
              deviceTrialAlreadyUsed: hasDeviceUsedTrial(),
            }
          : { phone, pin, deviceId };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed.');
      } else {
        if (mode === 'register') {
          markDeviceTrialUsed();
        }
        localStorage.setItem('gce_user', JSON.stringify(data.user));
        router.push('/dashboard');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }
    return (
    <main className="min-h-screen flex flex-col justify-center items-center px-4 py-10 bg-slate-950">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-600/20 border border-green-500/40 text-green-400">
            <BookOpen className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            GCE Pass Cameroon
          </h1>
          <p className="text-xs text-slate-400">
            TVEE Intermediate, GCE O-Level &amp; A-Level Past Questions with Verified Static Answers &amp; Offline Access.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-5">
          <div className="grid grid-cols-2 rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                mode === 'register'
                  ? 'bg-green-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign Up (7-Day Trial)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                mode === 'login'
                  ? 'bg-green-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Log In
            </button>
          </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Cameroon Phone Number
              </label>
              <div className="flex items-center rounded-xl bg-slate-800 border border-slate-700 px-3">
                <Smartphone className="w-4 h-4 text-green-400 mr-2" />
                <span className="text-slate-400 text-sm mr-1">+237</span>
                <input
                  type="tel"
                  required
                  placeholder="677000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-transparent py-2.5 text-white text-sm focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {mode === 'register'
                  ? 'Create Password (4–6 digits)'
                  : 'Password (4–6 digits)'}
              </label>
              <div className="flex items-center rounded-xl bg-slate-800 border border-slate-700 px-3">
                <KeyRound className="w-4 h-4 text-green-400 mr-2" />
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="\d{4,6}"
                  maxLength={6}
                  required
                  placeholder="e.g. 2468"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full bg-transparent py-2.5 text-white text-sm focus:outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-950/60 border border-red-800 p-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm text-white transition disabled:opacity-50"
            >
              {loading
                ? 'Please wait...'
                : mode === 'register'
                ? 'Start My 7-Day Free Trial'
                : 'Log In to My Papers'}
            </button>
          </form>

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            <span>Works offline • 350 XAF/mo or 2,100 XAF/yr via MTN MoMo</span>
          </div>
        </div>
      </div>
    </main>
  );
}
