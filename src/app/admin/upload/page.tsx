'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminQuestionEditor from '@/components/AdminQuestionEditor';
import { Camera, Image as ImageIcon, Sparkles, ArrowLeft, Trash2, ClipboardPaste, CheckCircle2 } from 'lucide-react';

const shrink = (file: File): Promise<string> =>
  new Promise((res) => {
    const r = new FileReader();
    r.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const s = Math.min(1, 1300 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = img.width * s;
        c.height = img.height * s;
        c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target?.result as string;
    };
    r.readAsDataURL(file);
  });

export default function AdminUploadPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [eduTypes, setEduTypes] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [eduId, setEduId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [deptId, setDeptId] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [year, setYear] = useState('2024');
  const [paperNumber, setPaperNumber] = useState(1);
  const [images, setImages] = useState<string[]>([]);
  const [jsonInput, setJsonInput] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('gce_user');
    if (!raw) { router.replace('/'); return; }
    const parsed = JSON.parse(raw);
    if (parsed.role !== 'admin') { router.replace('/dashboard'); return; }
    setUser(parsed);
    supabase.from('education_types').select('*').then(({ data }) => data && setEduTypes(data));
  }, [router]);

  useEffect(() => {
    if (eduId) supabase.from('levels').select('*').eq('education_type_id', eduId).then(({ data }) => setLevels(data || []));
  }, [eduId]);

  useEffect(() => {
    if (levelId) supabase.from('departments').select('*').eq('level_id', levelId).then(({ data }) => setDepartments(data || []));
  }, [levelId]);

  async function handlePhotos(files: FileList | null) {
    if (!files) return;
    const out = await Promise.all(Array.from(files).map(shrink));
    setImages((p) => [...p, ...out]);
  }

  async function handleExtract() {
    if (!images.length || !subjectName) return setMessage('Enter Subject Name and select at least 1 photo.');
    setExtracting(true); setMessage(null);
    const allQuestions: any[] = [];
    let previousContext = '';
    try {
      for (let i = 0; i < images.length; i++) {
        setMessage(`Extracting page ${i + 1} of ${images.length}...`);
        const res = await fetch('/api/admin/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: [images[i]], paperNumber, subjectName, year, previousContext }),
        });
        const data = await res.json();
        if (!res.ok) { setMessage(`Page ${i + 1}: ${data.error || 'Extraction failed.'}`); return; }
        const pageQs = data.questions || [];
        allQuestions.push(...pageQs);
        previousContext = pageQs.slice(-3).map((q: any) => `Q${q.question_number}: ${q.question_text}`).join('\n');
      }
      setQuestions(allQuestions);
      setMessage(`Extracted ${allQuestions.length} questions across ${images.length} page(s)!`);
    } catch { setMessage('Network error during extraction. Check connection and retry.'); }
    finally { setExtracting(false); }
  }

  function parseAndLoadJson(rawText: string) {
    setMessage(null);
    try {
      const start = rawText.indexOf('[');
      const end = rawText.lastIndexOf(']');
      if (start === -1 || end === -1 || end <= start) {
        setMessage('Invalid JSON: copy the full [...] list from Gemini chat.');
        return;
      }
      const list = JSON.parse(rawText.slice(start, end + 1));
      if (!Array.isArray(list) || list.length === 0) {
        setMessage('No questions found inside JSON.');
        return;
      }
      const normalized = list.map((q: any, idx: number) => ({
        question_number: Number(q.question_number ?? idx + 1),
        question_text: String(q.question_text ?? ''),
        options: Array.isArray(q.options) ? q.options.map(String) : [],
        static_correct_answer: String(q.static_correct_answer ?? '').trim(),
        static_explanation: String(q.static_explanation ?? ''),
        diagram_url: q.diagram_url || '',
        has_diagram: Boolean(q.has_diagram || q.diagram_url),
      }));
      setQuestions(normalized);
      setMessage(`Loaded ${normalized.length} questions! Review below and tap Publish.`);
    } catch {
      setMessage('Could not read JSON. Make sure you copied the entire JSON block cleanly.');
    }
  }

  async function handleClipboardPaste() {
    try {
      const text = await navigator.clipboard.readText();
      setJsonInput(text);
      parseAndLoadJson(text);
    } catch {
      setMessage('Tap inside the box below, paste manually, then tap Load Pasted Text.');
    }
  }
    async function handlePublish() {
    setPublishing(true); setMessage(null);
    try {
      let activeDeptId = deptId;
      if (!activeDeptId && newDeptName.trim() && levelId) {
        const { data } = await supabase.from('departments').insert({ level_id: levelId, name: newDeptName.trim() }).select('id').single();
        if (data) activeDeptId = data.id;
      }
      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId: user.id, departmentId: activeDeptId, subjectName, subjectCode, year, paperNumber, questions }),
      });
      const data = await res.json();
      if (!res.ok) setMessage(data.error || 'Publish failed.');
      else {
        setMessage('Success! Paper is now live.');
        setQuestions([]);
        setImages([]);
        setJsonInput('');
      }
    } catch { setMessage('Publish network error.'); }
    finally { setPublishing(false); }
  }

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1.5 text-xs text-slate-400">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <h1 className="text-lg font-extrabold text-white">Snap & Upload Past Paper</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <select value={eduId} onChange={(e) => setEduId(e.target.value)} className="rounded-xl bg-slate-800 border border-slate-700 p-3 text-white">
            <option value="">1. Education Type</option>
            {eduTypes.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={levelId} onChange={(e) => setLevelId(e.target.value)} className="rounded-xl bg-slate-800 border border-slate-700 p-3 text-white">
            <option value="">2. Level</option>
            {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={deptId} onChange={(e) => setDeptId(e.target.value)} className="rounded-xl bg-slate-800 border border-slate-700 p-3 text-white">
            <option value="">3. Existing Department (or type new →)</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} placeholder="Or New Department" className="rounded-xl bg-slate-800 border border-slate-700 p-3 text-white" />
          <input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="4. Subject Name" className="rounded-xl bg-slate-800 border border-slate-700 p-3 text-white" />
          <input value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} placeholder="Subject Code" className="rounded-xl bg-slate-800 border border-slate-700 p-3 text-white" />
          <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="5. Year" className="rounded-xl bg-slate-800 border border-slate-700 p-3 text-white" />
          <select value={paperNumber} onChange={(e) => setPaperNumber(Number(e.target.value))} className="rounded-xl bg-slate-800 border border-slate-700 p-3 text-white">
            <option value={1}>Paper 1 (MCQ)</option>
            <option value={2}>Paper 2 (Structured/Essay)</option>
            <option value={3}>Paper 3 (Practical)</option>
          </select>
        </div>

        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-emerald-300">Option 1: Paste JSON from Gemini Chat (100% Free)</span>
            {jsonInput && (
              <button type="button" onClick={() => setJsonInput('')} className="text-[11px] text-red-400 flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={handleClipboardPaste} className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">
              <ClipboardPaste className="w-4 h-4" />
              1-Tap Paste & Load
            </button>
            <button type="button" onClick={() => parseAndLoadJson(jsonInput)} className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 border border-slate-600 text-white font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Load Pasted Text
            </button>
          </div>
          <textarea
            rows={3}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Or long-press here to paste the JSON array from Gemini chat..."
            className="w-full rounded-xl bg-slate-950 border border-slate-700 p-3 text-xs font-mono text-slate-200"
          />
        </div>

        <div className="rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/60 p-5 space-y-3 text-center">
          <p className="text-xs font-semibold text-slate-400">Option 2: Direct Gemini API Photo Upload</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="relative flex flex-col items-center justify-center rounded-xl bg-slate-800 border border-slate-600 p-4 text-white overflow-hidden">
              <Camera className="w-7 h-7 text-green-400 mb-1" />
              <span className="text-xs font-bold">Snap Camera</span>
              <input type="file" accept="image/*" capture="environment" className="absolute inset-0 opacity-0" onChange={(e) => handlePhotos(e.target.files)} />
            </label>
            <label className="relative flex flex-col items-center justify-center rounded-xl bg-slate-800 border border-slate-600 p-4 text-white overflow-hidden">
              <ImageIcon className="w-7 h-7 text-sky-400 mb-1" />
              <span className="text-xs font-bold">Pick Gallery</span>
              <input type="file" accept="image/*" multiple className="absolute inset-0 opacity-0" onChange={(e) => handlePhotos(e.target.files)} />
            </label>
          </div>
          <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400">
            <span>{images.length} page(s) selected</span>
            {images.length > 0 && <button type="button" onClick={() => setImages([])} className="text-red-400 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Clear</button>}
          </div>
        </div>

        {images.length > 0 && <div className="flex gap-2 overflow-x-auto pb-2">{images.map((src, i) => <img key={i} src={src} alt="" className="h-20 rounded-lg border border-slate-700" />)}</div>}

        <button type="button" disabled={extracting} onClick={handleExtract} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-400 font-bold text-sm text-slate-950 disabled:opacity-50">
          <Sparkles className="w-4 h-4" />
          {extracting ? 'Extracting & Solving with Gemini AI...' : 'Extract & Solve with Gemini AI'}
        </button>
        {message && <p className="text-xs font-semibold text-center text-amber-300 bg-slate-800 rounded-xl p-3">{message}</p>}
      </div>

      {questions.length > 0 && <AdminQuestionEditor questions={questions} setQuestions={setQuestions} paperNumber={paperNumber} onPublish={handlePublish} publishing={publishing} />}
    </div>
  );
}
