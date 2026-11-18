'use client';

import React, { useState } from 'react';
import { Lock, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SubscriptionModal({
  userId,
  defaultPhone,
  onClose,
}: {
  userId: string;
  defaultPhone: string;
  onClose?: () => void;
}) {
  const [planType, setPlanType] = useState<'monthly' | 'academic_year'>('academic_year');
  const [momoPhone, setMomoPhone] = useState(
    defaultPhone?.startsWith('237') ? defaultPhone.slice(3) : defaultPhone || ''
  );
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, momoPhone, planType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Payment failed.');
      } else {
        setStatusMsg(
          data.message ||
            'MTN MoMo prompt sent! Enter your PIN on your phone, then refresh this page.'
        );
      }
    } catch {
      setErrorMsg('Network error. Check your internet connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center gap-3 text-amber-400 mb-3">
          <Lock className="w-6 h-6" />
          <h2 className="text-xl font-bold text-white">Subscription Required</h2>
        </div>

        <p className="text-sm text-slate-300 mb-5">
          Your free trial or active plan has expired. Renew with <strong>MTN Mobile Money</strong> to unlock all past papers and offline access.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            type="button"
            onClick={() => setPlanType('monthly')}
            className={`p-3 rounded-xl border text-left transition ${
              planType === 'monthly'
                ? 'border-yellow-400 bg-yellow-400/10'
                : 'border-slate-700 bg-slate-800/50'
            }`}
          >
            <div className="text-xs text-slate-400">Monthly Plan</div>
            <div className="text-lg font-extrabold text-white">350 XAF</div>
            <div className="text-[11px] text-slate-400">Valid for 30 days</div>
          </button>

          <button
            type="button"
            onClick={() => setPlanType('academic_year')}
            className={`p-3 rounded-xl border text-left transition relative ${
              planType === 'academic_year'
                ? 'border-green-500 bg-green-500/10'
                : 'border-slate-700 bg-slate-800/50'
            }`}
          >
            <span className="absolute -top-2 right-2 bg-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full text-white">
              BEST VALUE
            </span>
            <div className="text-xs text-slate-400">Academic Year</div>
            <div className="text-lg font-extrabold text-white">2,100 XAF</div>
            <div className="text-[11px] text-green-400">Valid till Aug 31</div>
          </button>
        </div>

        <form onSubmit={handlePay} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              MTN MoMo Number (Cameroon)
            </label>
            <div className="flex items-center rounded-xl bg-slate-800 border border-slate-700 px-3">
              <Smartphone className="w-4 h-4 text-yellow-400 mr-2" />
              <span className="text-slate-400 text-sm mr-1">+237</span>
              <input
                type="tel"
                required
                placeholder="677000000"
                value={momoPhone}
                onChange={(e) => setMomoPhone(e.target.value)}
                className="w-full bg-transparent py-2.5 text-white text-sm focus:outline-none"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 text-xs text-red-400 bg-red-950/50 border border-red-800 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {statusMsg && (
            <div className="flex items-start gap-2 text-xs text-green-300 bg-green-950/60 border border-green-700 p-3 rounded-xl">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p>{statusMsg}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-2 underline font-bold text-white"
                >
                  I have entered my PIN — Refresh Access
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-slate-950 bg-yellow-400 hover:bg-yellow-300 transition disabled:opacity-50"
          >
            {loading
              ? 'Sending MTN MoMo Prompt...'
              : `Pay ${planType === 'monthly' ? '350 XAF' : '2,100 XAF'} with MTN MoMo`}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-full text-xs text-slate-400 hover:text-white pt-1"
            >
              Close
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
