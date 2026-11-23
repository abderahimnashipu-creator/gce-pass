'use client';

import React, { useState, useEffect } from 'react';
import MathText from './MathText';
import { Clock, CheckCircle, XCircle, RotateCcw, Award, Share2 } from 'lucide-react';

export interface QuestionItem {
  id: string;
  question_number: number;
  question_text: string;
  diagram_url?: string | null;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  static_correct_answer: string;
  static_explanation: string;
}

function getGceGradeInfo(pct: number) {
  if (pct >= 75) {
    return {
      grade: 'Grade A',
      label: 'Distinction Pace!',
      badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-400',
      bannerStyle: 'bg-emerald-950/80 border-emerald-500',
    };
  }
  if (pct >= 65) {
    return {
      grade: 'Grade B',
      label: 'Strong Pass Pace!',
      badgeStyle: 'bg-green-500/20 text-green-300 border-green-400',
      bannerStyle: 'bg-green-950/80 border-green-500',
    };
  }
  if (pct >= 50) {
    return {
      grade: 'Grade C',
      label: 'Credit Pass Pace!',
      badgeStyle: 'bg-teal-500/20 text-teal-300 border-teal-400',
      bannerStyle: 'bg-teal-950/80 border-teal-500',
    };
  }
  if (pct >= 40) {
    return {
      grade: 'Grade D',
      label: 'Pass — Keep Pushing!',
      badgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-400',
      bannerStyle: 'bg-amber-950/70 border-amber-500',
    };
  }
  if (pct >= 35) {
    return {
      grade: 'Grade E',
      label: 'Borderline — Review Weak Topics!',
      badgeStyle: 'bg-orange-500/20 text-orange-300 border-orange-400',
      bannerStyle: 'bg-orange-950/70 border-orange-500',
    };
  }
  if (pct >= 30) {
    return {
      grade: 'Grade F',
      label: 'Weak Fail — Practice & Retry!',
      badgeStyle: 'bg-rose-500/20 text-rose-300 border-rose-400',
      bannerStyle: 'bg-rose-950/70 border-rose-500',
    };
  }
  return {
    grade: 'Grade U',
    label: 'Unclassified — Study & Retry!',
    badgeStyle: 'bg-red-500/20 text-red-300 border-red-400',
    bannerStyle: 'bg-red-950/70 border-red-500',
  };
}
export default function Paper1Simulator({
  questions,
  durationMinutes = 90,
}: {
  questions: QuestionItem[];
  durationMinutes?: number;
}) {
  const [mode, setMode] = useState<'practice' | 'exam'>('practice');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);

  useEffect(() => {
    if (mode !== 'exam' || submitted) return;
    if (secondsLeft <= 0) {
      setSubmitted(true);
      return;
    }
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [mode, submitted, secondsLeft]);

  function handleSelect(qId: string, opt: string) {
    if (mode === 'exam' && submitted) return;
    if (mode === 'practice' && answers[qId]) return;
    setAnswers((prev) => ({ ...prev, [qId]: opt }));
  }

  function resetTest(newMode: 'practice' | 'exam') {
    setMode(newMode);
    setAnswers({});
    setSubmitted(false);
    setSecondsLeft(durationMinutes * 60);
  }

  const score = questions.reduce(
    (acc, q) =>
      answers[q.id]?.toUpperCase() === q.static_correct_answer.toUpperCase()
        ? acc + 1
        : acc,
    0
  );

  const percentage =
    questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const gceInfo = getGceGradeInfo(percentage);

    async function shareOnWhatsApp() {
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const text = `🏆 I just scored ${score}/${questions.length} (${percentage}% - ${gceInfo.grade}: ${gceInfo.label}) on Cameroon GCE Paper 1 using GCE Pass!\n\nCan you beat my score? Try now:\n${siteUrl}`;
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


  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div className="space-y-6">
      {/* Mode Switcher & Timer Bar */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900/95 backdrop-blur border border-slate-800 p-4">
        <div className="flex gap-2">
          <button
            onClick={() => resetTest('practice')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              mode === 'practice'
                ? 'bg-green-600 text-white'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            Practice Mode
          </button>
          <button
            onClick={() => resetTest('exam')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              mode === 'exam'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            Timed Exam Mode
          </button>
        </div>

        {mode === 'exam' && !submitted && (
          <div className="flex items-center gap-2 text-sm font-mono font-bold text-amber-400">
            <Clock className="w-4 h-4" />
            <span>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
          </div>
        )}

        <button
          onClick={() => resetTest(mode)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      {/* Exam Score & GCE Grade Banner */}
      {mode === 'exam' && submitted && (
        <div
          className={`rounded-2xl border p-5 text-center space-y-3 ${gceInfo.bannerStyle}`}
        >
          <div className="text-xs uppercase tracking-wider text-slate-300 font-semibold">
            Exam Completed
          </div>

          <div className="text-3xl font-extrabold text-white">
            {score} / {questions.length} ({percentage}%)
          </div>

          {/* GCE Grade Badge */}
          <div className="flex justify-center">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1 text-sm font-extrabold shadow-sm ${gceInfo.badgeStyle}`}
            >
              <Award className="w-4 h-4" />
              {gceInfo.grade} — {gceInfo.label}
            </span>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={shareOnWhatsApp}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 hover:bg-green-500 px-4 py-2 text-xs font-bold text-white shadow transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              Challenge a Friend on WhatsApp
            </button>
          </div>

          <p className="text-xs text-slate-300">
            Scroll down to review every verified static answer and explanation.
          </p>
        </div>
      )}

      {/* Question List */}
      <div className="space-y-5">
        {questions.map((q) => {
          const picked = answers[q.id];
          const revealAnswer =
            (mode === 'practice' && Boolean(picked)) ||
            (mode === 'exam' && submitted);

          const options = [
            { key: 'A', text: q.option_a },
            { key: 'B', text: q.option_b },
            { key: 'C', text: q.option_c },
            { key: 'D', text: q.option_d },
          ];

          return (
            <div
              key={q.id}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4"
            >
              <div className="flex items-start gap-3">
                <span className="shrink-0 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-green-400">
                  Q{q.question_number}
                </span>
                <div className="text-sm text-slate-100">
                  <MathText text={q.question_text} />
                </div>
              </div>

              {q.diagram_url && (
                <img
                  src={q.diagram_url}
                  alt={`Diagram for Question ${q.question_number}`}
                  className="max-h-60 rounded-xl border border-slate-700 bg-white p-2 object-contain"
                />
              )}

              <div className="grid grid-cols-1 gap-2.5">
                {options.map((opt) => {
                  if (!opt.text) return null;
                  const isSelected = picked === opt.key;
                  const isCorrect =
                    opt.key === q.static_correct_answer.toUpperCase();

                  let btnStyle =
                    'border-slate-700 bg-slate-800/60 text-slate-200 hover:border-slate-500';
                  if (revealAnswer) {
                    if (isCorrect) {
                      btnStyle =
                        'border-green-500 bg-green-500/20 text-green-200 font-semibold';
                    } else if (isSelected && !isCorrect) {
                      btnStyle =
                        'border-red-500 bg-red-500/20 text-red-200';
                    }
                  } else if (isSelected) {
                    btnStyle =
                      'border-amber-400 bg-amber-400/20 text-amber-200 font-semibold';
                  }

                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleSelect(q.id, opt.key)}
                      className={`flex items-center justify-between rounded-xl border p-3 text-left text-sm transition ${btnStyle}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="font-bold">{opt.key}.</span>
                        <MathText text={opt.text} />
                      </div>
                      {revealAnswer && isCorrect && (
                        <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                      )}
                      {revealAnswer && isSelected && !isCorrect && (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {revealAnswer && (
                <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 text-xs space-y-1.5">
                  <div className="font-bold text-green-400">
                    Verified Answer: {q.static_correct_answer}
                  </div>
                  <div className="text-slate-300">
                    <MathText text={q.static_explanation} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {mode === 'exam' && !submitted && questions.length > 0 && (
        <button
          type="button"
          onClick={() => setSubmitted(true)}
          className="w-full py-3.5 rounded-2xl bg-green-600 hover:bg-green-500 font-bold text-white shadow-lg"
        >
          Submit Exam
        </button>
      )}
    </div>
  );
              }
        
