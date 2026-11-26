'use client';

import React, { useState } from 'react';
import MathText from './MathText';
import { QuestionItem } from './Paper1Simulator';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';

function formatReadable(text?: string) {
  if (!text) return '';
  const letters = text.replace(/[^a-zA-Z]/g, '');
  const isAllCaps = letters.length > 20 && letters === letters.toUpperCase();
  if (!isAllCaps) return text;
  return text
    .toLowerCase()
    .replace(/(^\s*\w|[\.\!\?\n]\s*\w|\([a-z0-9]+\)\s*\w)/g, (m) => m.toUpperCase());
}

export default function StructuredPaperViewer({
  questions,
}: {
  questions: QuestionItem[];
}) {
  const [openSolutions, setOpenSolutions] = useState<Record<string, boolean>>({});

  function toggleSolution(id: string) {
    setOpenSolutions((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="space-y-5">
      {questions.map((q) => {
        const isOpen = Boolean(openSolutions[q.id]);
        return (
          <div
            key={q.id}
            className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-emerald-400">
                Question {q.question_number}
              </span>
              <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                <MathText text={q.question_text} />
              </div>
            </div>

            {q.diagram_url && (
              <img
                src={q.diagram_url}
                alt={`Diagram for Question ${q.question_number}`}
                className="max-h-64 rounded-xl border border-slate-700 bg-white p-2 object-contain"
              />
            )}

            <button
              type="button"
              onClick={() => toggleSolution(q.id)}
              className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-emerald-300 transition"
            >
              {isOpen ? (
                <>
                  <EyeOff className="w-4 h-4" /> Hide Verified Solution
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" /> Show Verified Solution
                </>
              )}
            </button>

            {isOpen && (
              <div className="rounded-xl bg-slate-800/80 border border-slate-700 p-4 space-y-3 text-sm">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verified Solution</span>
                </div>
                <div className="font-normal text-slate-200 leading-relaxed whitespace-pre-line">
                  <MathText text={formatReadable(q.static_correct_answer)} />
                </div>
                {q.static_explanation && (
                  <div className="text-xs text-slate-400 leading-relaxed border-t border-slate-700 pt-2.5">
                    <MathText text={q.static_explanation} />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
                     }
