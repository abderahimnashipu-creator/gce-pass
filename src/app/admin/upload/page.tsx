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
  const [year, setYear] = useState('2026');
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

  function normalizeOptions(rawOpts: any) {
    if (!rawOpts) return { A: '', B: '', C: '', D: '' };
    if (Array.isArray(rawOpts)) {
      const strip = (s: any) => String(s ?? '').replace(/^[A-Da-d][\.\)\:\-]\s*/, '').trim();
      return {
        A: strip(rawOpts.at(0)),
        B: strip(rawOpts.at(1)),
        C: strip(rawOpts.at(2)),
        D: strip(rawOpts.at(3)),
      };
    }
    return {
      A: String(rawOpts.A ?? rawOpts.a ?? ''),
      B: String(rawOpts.B ?? rawOpts.b ?? ''),
      C: String(rawOpts.C ?? rawOpts.c ?? ''),
      D: String(rawOpts.D ?? rawOpts.d ?? ''),
    };
          }
    function parseAndLoadJson(rawText: string, append = false) {
    setMessage(null);
    try {
      const fixed = rawText.replace(/\]\s*\[/g, ',');
      const start = fixed.indexOf('[');
      const end = fixed.lastIndexOf(']');
      if (start === -1 || end === -1 || end <= start) {
        setMessage('Invalid JSON: copy the full [...] list from Gemini chat.');
        return;
      }
      const list = JSON.parse(fixed.slice(start, end + 1));
      if (!Array.isArray(list) || list.length === 0) {
        setMessage('No questions found inside JSON.');
        return;
      }
      const normalized = list.map((q: any, idx: number) => {
        const opts = normalizeOptions(q.options);
        const rawAns = String(q.static_correct_answer ?? '').trim();
        return {
          question_number: Number(q.question_number ?? idx + 1),
          question_text: String(q.question_text ?? ''),
          options: opts,
          option_a: opts.A,
          option_b: opts.B,
          option_c: opts.C,
          option_d: opts.D,
          static_correct_answer: Number(paperNumber) === 1 ? rawAns.toUpperCase() : rawAns,
          static_explanation: String(q.static_explanation ?? ''),
          diagram_url: q.diagram_url || '',
          has_diagram: Boolean(q.has_diagram || q.diagram_url),
        };
      });

      const base = append ? questions : [];
      const map = new Map<number, any>();
      [...base, ...normalized].forEach((item) => map.set(item.question_number, item));
      const combined = Array.from(map.values()).sort((a, b) => a.question_number - b.question_number);
      setQuestions(combined);
      setMessage(`Loaded ${combined.length} unique questions! Review below and tap Publish.`);
    } catch {
      setMessage('Could not read JSON. Make sure you copied the entire JSON block cleanly.');
    }
  }

  async function handleClipboardPaste(append = false) {
    try {
      const text = await navigator.clipboard.readText();
      setJsonInput(text);
      parseAndLoadJson(text, append);
    } catch {
      setMessage('Tap inside the box below, paste manually, then tap Load Box.');
    }
  }

  async function handlePublish() {
    setPublishing(true); setMessage(null);
    try {
      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: user.id,
          levelId,
          departmentId: deptId,
          newDeptName: newDeptName.trim(),
          subjectName,
          subjectCode,
          year,
          paperNumber,
          questions,
        }),
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
        <h1 className="text-lg font-extrabold text-white">Snap &amp; Upload Past Paper</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <select value={eduId} onChange={(e) => { setEduId(e.target.value); setLevelId(''); setDeptId(''); }} className="rounded-xl bg-slate-800 border border-slate-700 p-2.5 text-white">
            <option value="">1. Education Type</option>
            {eduTypes.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>

          <select value={levelId} onChange={(e) => { setLevelId(e.target.value); setDeptId(''); }} className="rounded-xl bg-slate-800 border border-slate-700 p-2.5 text-white">
            <option value="">2. Level</option>
            {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>

          <select value={deptId} onChange={(e) => setDeptId(e.target.value)} className="rounded-xl bg-slate-800 border border-slate-700 p-2.5 text-white">
            <option value="">3. Existing Department (or type new)</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          <input placeholder="Or New Department Name" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} className="rounded-xl bg-slate-800 border border-slate-700 p-2.5 text-white" />
          <input placeholder="Subject Name (e.g. Resource Management on Home Studies)" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} className="rounded-xl bg-slate-800 border border-slate-700 p-2.5 text-white" />
          <input placeholder="Subject Code (e.g. 5040)" value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} className="rounded-xl bg-slate-800 border border-slate-700 p-2.5 text-white" />
          <input placeholder="Year (e.g. 2026)" value={year} onChange={(e) => setYear(e.target.value)} className="rounded-xl bg-slate-800 border border-slate-700 p-2.5 text-white" />

          <select value={paperNumber} onChange={(e) => setPaperNumber(Number(e.target.value))} className="rounded-xl bg-slate-800 border border-slate-700 p-2.5 text-white">
            <option value={1}>Paper 1 (MCQs)</option>
            <option value={2}>Paper 2 (Structured / Essay)</option>
            <option value={3}>Paper 3 (Practical)</option>
          </select>
        </div>

        <div className="rounded-xl bg-slate-950 border border-green-900/60 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-green-400">Option 1: Paste JSON from Gemini Chat (Unlimited &amp; Free)</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => handleClipboardPaste(false)} className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white">
                <ClipboardPaste className="w-3.5 h-3.5" /> Paste &amp; Replace
              </button>
              <button type="button" onClick={() => handleClipboardPaste(true)} className="flex items-center gap-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-bold text-green-300">
                + Paste &amp; Append
              </button>
            </div>
          </div>

          <textarea
            rows={4}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='Paste JSON array here: [{"question_number":1,...}]'
            className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-xs font-mono text-slate-200"
          />

          <div className="flex gap-2">
            <button type="button" onClick={() => parseAndLoadJson(jsonInput, false)} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white">
              Load Box (Replace)
            </button>
            <button type="button" onClick={() => parseAndLoadJson(jsonInput, true)} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-green-300">
              Load Box (Append Batch)
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3">
          <span className="text-xs font-bold text-slate-300">Option 2: Snap Photos &amp; Extract via API</span>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-xs font-bold text-white cursor-pointer">
              <Camera className="w-4 h-4 text-green-400" /> Take Photo
              <input type="file" accept="image/*" capture="environment" multiple onChange={(e) => handlePhotos(e.target.files)} className="hidden" />
            </label>
            <label className="flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-xs font-bold text-white cursor-pointer">
              <ImageIcon className="w-4 h-4 text-green-400" /> Gallery ({images.length})
              <input type="file" accept="image/*" multiple onChange={(e) => handlePhotos(e.target.files)} className="hidden" />
            </label>
            {images.length > 0 && (
              <button onClick={() => setImages([])} className="flex items-center gap-1 rounded-xl bg-red-950/60 border border-red-800 px-3 py-2 text-xs text-red-300">
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
          <button onClick={handleExtract} disabled={extracting || !images.length} className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-green-400 disabled:opacity-50">
            <Sparkles className="w-4 h-4" />
            {extracting ? 'Extracting...' : 'Extract Questions from Photos'}
          </button>
        </div>

        {message && <div className="rounded-xl bg-slate-800 p-3 text-xs text-green-300">{message}</div>}
      </div>

            {questions.length > 0 && (
        <AdminQuestionEditor
          questions={questions}
          setQuestions={setQuestions}
          paperNumber={paperNumber}
          onPublish={handlePublish}
          publishing={publishing}
        />
      )}
    </div>
  );
}
