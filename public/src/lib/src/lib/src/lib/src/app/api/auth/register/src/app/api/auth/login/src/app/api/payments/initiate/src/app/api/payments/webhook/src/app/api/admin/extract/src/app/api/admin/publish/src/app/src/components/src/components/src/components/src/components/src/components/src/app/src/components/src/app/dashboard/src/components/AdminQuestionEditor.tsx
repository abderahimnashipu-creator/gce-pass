'use client';

import React from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, ImagePlus, Trash2 } from 'lucide-react';

export default function AdminQuestionEditor({
  questions,
  setQuestions,
  paperNumber,
  onPublish,
  publishing,
}: {
  questions: any[];
  setQuestions: React.Dispatch<React.SetStateAction<any[]>>;
  paperNumber: number;
  onPublish: () => void;
  publishing: boolean;
}) {
  function updateField(index: number, field: string, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  }

  async function handleDiagramUpload(index: number, file?: File) {
    if (!file) return;
    const fileName = `diag_${Date.now()}_${index}.webp`;
    const { data, error } = await supabase.storage
      .from('diagrams')
      .upload(fileName, file, { contentType: file.type, upsert: true });

    if (!error && data) {
      const { data: urlData } = supabase.storage
        .from('diagrams')
        .getPublicUrl(data.path);
      updateField(index, 'diagram_url', urlData.publicUrl);
    }
  }

  if (questions.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-green-400">
          AI Extracted Draft ({questions.length} Questions) — Review & Approve
        </h3>
      </div>

      {questions.map((q, idx) => (
        <div
          key={idx}
          className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3 text-xs"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-white">
              Question #{q.question_number || idx + 1}
            </span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 cursor-pointer text-amber-400 hover:underline">
                <ImagePlus className="w-4 h-4" />
                <span>{q.diagram_url ? 'Change Diagram' : 'Add Diagram'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleDiagramUpload(idx, e.target.files?.[0])}
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  setQuestions((prev) => prev.filter((_, i) => i !== idx))
                }
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {q.diagram_url && (
            <img
              src={q.diagram_url}
              alt="Diagram preview"
              className="max-h-36 rounded-lg bg-white p-1 object-contain"
            />
          )}

          <textarea
            rows={2}
            value={q.question_text || ''}
            onChange={(e) => updateField(idx, 'question_text', e.target.value)}
            placeholder="Question text (use $...$ for math)"
            className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2.5 text-white"
          />

          {Number(paperNumber) === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(['a', 'b', 'c', 'd'] as const).map((opt) => (
                <input
                  key={opt}
                  value={q[`option_${opt}`] || ''}
                  onChange={(e) =>
                    updateField(idx, `option_${opt}`, e.target.value)
                  }
                  placeholder={`Option ${opt.toUpperCase()}`}
                  className="rounded-xl bg-slate-800 border border-slate-700 p-2 text-white"
                />
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            <input
              value={q.static_correct_answer || ''}
              onChange={(e) =>
                updateField(idx, 'static_correct_answer', e.target.value)
              }
              placeholder="Static Verified Answer (e.g. A, B, C, D or full answer)"
              className="rounded-xl bg-slate-800 border border-green-700/60 p-2 text-green-300 font-semibold"
            />
            <textarea
              rows={2}
              value={q.static_explanation || ''}
              onChange={(e) =>
                updateField(idx, 'static_explanation', e.target.value)
              }
              placeholder="Step-by-step static explanation"
              className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2.5 text-slate-200"
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        disabled={publishing}
        onClick={onPublish}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-600 hover:bg-green-500 font-bold text-sm text-white shadow-lg disabled:opacity-50"
      >
        <CheckCircle2 className="w-5 h-5" />
        {publishing ? 'Publishing to Students...' : 'Approve & Publish Paper Live'}
      </button>
    </div>
  );
}
