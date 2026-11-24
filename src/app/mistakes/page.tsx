'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getMistakes,
  removeMistake,
  removeSubjectMistakes,
  type MistakeItem,
} from '@/lib/mistakeBank';

export default function MistakeBankPage() {
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    setMistakes(getMistakes());
  }, []);

  const subjects = ['All', ...Array.from(new Set(mistakes.map((m) => m.subjectName)))];

  const visibleMistakes =
    selectedSubject === 'All'
      ? mistakes
      : mistakes.filter((m) => m.subjectName === selectedSubject);

  const handleSelectOption = (item: MistakeItem, choice: string) => {
    if (answers[item.id]) return;
    setAnswers((prev) => ({ ...prev, [item.id]: choice }));

    if (choice === item.static_correct_answer) {
      setTimeout(() => {
        const updated = removeMistake(item.id);
        setMistakes(updated);
      }, 1400);
    }
  };

  const handleRemoveOne = (id: string) => {
    setMistakes(removeMistake(id));
  };

  const handleRemoveSubject = () => {
    if (selectedSubject === 'All') return;
    const updated = removeSubjectMistakes(selectedSubject);
    setMistakes(updated);
    setSelectedSubject('All');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-amber-400">My Mistake Bank</h1>
            <p className="text-xs text-slate-400">
              {mistakes.length} saved {mistakes.length === 1 ? 'question' : 'questions'} • Works offline
            </p>
          </div>
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200"
          >
            ← Dashboard
          </Link>
        </div>
      </header>
            <main className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        {subjects.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            {subjects.map((subj) => {
              const count =
                subj === 'All'
                  ? mistakes.length
                  : mistakes.filter((m) => m.subjectName === subj).length;
              const active = selectedSubject === subj;
              return (
                <button
                  key={subj}
                  onClick={() => setSelectedSubject(subj)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    active
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-900 text-slate-300 border-slate-700'
                  }`}
                >
                  {subj} ({count})
                </button>
              );
            })}
            {selectedSubject !== 'All' && (
              <button
                onClick={handleRemoveSubject}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800"
              >
                Remove Subject
              </button>
            )}
          </div>
        )}

        {visibleMistakes.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-200">No saved mistakes yet!</p>
            <p className="text-xs text-slate-400">
              Any question you miss in Paper 1 practice or Class Exams appears here automatically.
            </p>
          </div>
        ) : (
          visibleMistakes.map((item, idx) => {
            const picked = answers[item.id];
            const isCorrect = picked === item.static_correct_answer;
            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                    {item.subjectName}
                  </span>
                  <button
                    onClick={() => handleRemoveOne(item.id)}
                    aria-label="Remove question"
                    className="text-slate-400 hover:text-rose-400 text-sm font-bold px-1.5"
                  >
                    ×
                  </button>
                </div>

                <p className="text-sm text-slate-100 whitespace-pre-line">
                  <span className="font-bold text-amber-400 mr-1.5">Q{idx + 1}.</span>
                  {item.question_text}
                </p>

                {item.diagram_url && (
                  <img
                    src={item.diagram_url}
                    alt="Question diagram"
                    className="max-h-56 rounded-lg border border-slate-700 bg-white p-1"
                  />
                )}

                <div className="grid grid-cols-1 gap-2">
                  {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                    const text = item.options[letter];
                    if (!text) return null;
                    let style = 'bg-slate-800 border-slate-700 text-slate-200';
                    if (picked) {
                      if (letter === item.static_correct_answer) {
                        style = 'bg-emerald-950 border-emerald-500 text-emerald-200';
                      } else if (letter === picked) {
                        style = 'bg-rose-950 border-rose-500 text-rose-200';
                      }
                    }
                    return (
                      <button
                        key={letter}
                        onClick={() => handleSelectOption(item, letter)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs ${style}`}
                      >
                        <span className="font-bold mr-2">{letter}.</span>
                        {text}
                      </button>
                    );
                  })}
                </div>

                {picked && (
                  <div className="text-xs rounded-lg p-2.5 bg-slate-800 border border-slate-700 text-slate-300">
                    <span className="font-bold text-emerald-400">
                      {isCorrect ? 'Mastered! Clearing...' : `Answer: ${item.static_correct_answer} — `}
                    </span>
                    {!isCorrect && (item.static_explanation || 'Review this concept carefully.')}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
                      }
                                                       
