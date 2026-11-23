'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isSubscriptionActive, savePaperOffline, loadPaperOffline } from '@/lib/offlineCache';
import AntiPiracyWrapper from '@/components/AntiPiracyWrapper';
import SubscriptionModal from '@/components/SubscriptionModal';
import PaperSelector from '@/components/PaperSelector';
import Paper1Simulator, { QuestionItem } from '@/components/Paper1Simulator';
import StructuredPaperViewer from '@/components/StructuredPaperViewer';
import { LogOut, WifiOff, ShieldAlert, Upload, Users, Share2 } from 'lucide-react';

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [expired, setExpired] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [activePaper, setActivePaper] = useState<any>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);

  const practicalDays = Math.max(0, Math.ceil((new Date('2027-05-04T07:30:00+01:00').getTime() - Date.now()) / 86400000));
  const writtenDays = Math.max(0, Math.ceil((new Date('2027-06-01T07:30:00+01:00').getTime() - Date.now()) / 86400000));

  async function handleInviteFriend() {
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const text = `📚 Preparing for Cameroon GCE? Practice real Past Questions with verified static answers & explanations on GCE Pass Cameroon!\n\nStart your 7-day free trial now:\n${siteUrl}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }
    window.location.href = 'whatsapp://send?text=' + encodeURIComponent(text);
  }

  useEffect(() => {
    const raw = localStorage.getItem('gce_user');
    if (!raw) { router.replace('/'); return; }
    const parsed = JSON.parse(raw);
    setUser(parsed);
    setExpired(!isSubscriptionActive(parsed.subscription_expires_at));

    supabase
      .from('users')
      .select('id, phone_number, role, subscription_plan, subscription_expires_at')
      .eq('id', parsed.id)
      .single()
      .then(({ data }) => {
        if (data) {
          localStorage.setItem('gce_user', JSON.stringify(data));
          setUser(data);
          setExpired(!isSubscriptionActive(data.subscription_expires_at));
        }
      });
  }, [router]);

  async function handleSelectPaper(paperMeta: any) {
    if (!user) return;
    if (!isSubscriptionActive(user.subscription_expires_at)) {
      setExpired(true);
      return;
    }
    setLoading(true);
    setOffline(false);
    setActivePaper(paperMeta);
        try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('paper_id', paperMeta.id)
        .order('question_number', { ascending: true });
      if (error || !data) throw error;
      setQuestions(data);
      await savePaperOffline(paperMeta.id, { paper: paperMeta, questions: data }, user.id, user.subscription_expires_at);
    } catch {
      const cached = await loadPaperOffline(paperMeta.id, user.id, user.subscription_expires_at);
      if (cached) {
        setActivePaper(cached.paper);
        setQuestions(cached.questions);
        setOffline(true);
      } else {
        setQuestions([]);
      }
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <AntiPiracyWrapper phoneNumber={user.phone_number}>
      {(expired || showUpgrade) && (
        <SubscriptionModal
          userId={user.id}
          defaultPhone={user.phone_number}
          onClose={expired ? undefined : () => setShowUpgrade(false)}
        />
      )}

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 border border-slate-800 p-4">
          <div>
            <h1 className="font-extrabold text-base text-white">GCE Pass Cameroon</h1>
            <p className="text-[11px] text-slate-400">
              +{user.phone_number} • Expires: <span className="text-green-400 font-semibold">{new Date(user.subscription_expires_at).toLocaleDateString()}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user.role === 'admin' && (
              <button onClick={() => router.push('/admin/upload')} className="flex items-center gap-1 rounded-xl bg-green-600 px-3 py-1.5 text-xs font-bold text-white">
                <Upload className="w-3.5 h-3.5" /> Admin Upload
              </button>
            )}
            <button onClick={() => router.push('/teacher')} className="flex items-center gap-1 rounded-xl bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-bold text-white">
              <Users className="w-3.5 h-3.5" /> Class Portal
            </button>
            <button onClick={handleInviteFriend} className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white">
              <Share2 className="w-3.5 h-3.5" /> Invite Friend
            </button>
            <button onClick={() => setShowUpgrade(true)} className="rounded-xl bg-yellow-400/15 border border-yellow-400/40 px-3 py-1.5 text-xs font-bold text-yellow-300">
              Renew Plan
            </button>
            <button onClick={() => { localStorage.removeItem('gce_user'); router.replace('/'); }} className="p-2 rounded-xl bg-slate-800 text-slate-300">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="w-full grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
            <div className="rounded-xl bg-[#26190d] border border-amber-500/40 p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-amber-300 font-semibold">📅 GCE Practicals</div>
              <div className="text-sm font-extrabold text-white mt-0.5">{practicalDays} Days Left</div>
              <div className="text-[10px] text-amber-200/70">Starts May 4, 2027</div>
            </div>
            <div className="rounded-xl bg-[#0c261d] border border-emerald-500/40 p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-emerald-300 font-semibold">✍️ GCE Written</div>
              <div className="text-sm font-extrabold text-white mt-0.5">{writtenDays} Days Left</div>
              <div className="text-[10px] text-emerald-200/70">Starts June 1, 2027</div>
            </div>
          </div>
        </header>

        <PaperSelector onSelectPaper={handleSelectPaper} />

        {offline && (
          <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-amber-600 p-3 text-xs text-amber-200">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>Offline Mode: Viewing encrypted local copy.</span>
          </div>
        )}

        {loading && <div className="text-center py-8 text-sm text-slate-400">Loading questions...</div>}

        {!loading && activePaper && questions.length === 0 && (
          <div className="flex items-center gap-2 rounded-2xl bg-slate-900 border border-slate-800 p-5 text-xs text-slate-400">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <span>No questions found or not cached offline yet.</span>
          </div>
        )}

        {!loading && activePaper && questions.length > 0 && (
          Number(activePaper.paper_number) === 1
            ? <Paper1Simulator questions={questions} durationMinutes={activePaper.duration_minutes || 90} />
            : <StructuredPaperViewer questions={questions} />
        )}
      </div>
    </AntiPiracyWrapper>
  );
}
