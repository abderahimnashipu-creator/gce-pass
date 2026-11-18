'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminQuestionEditor from '@/components/AdminQuestionEditor';
import { Camera, Image as ImageIcon, Sparkles, ArrowLeft } from 'lucide-react';

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

    supabase.from('education_types').select('*').then(({ data }) => {
      if (data) setEduTypes(data);
    });
  }, [router]);

  useEffect(() => {
    if (!eduId) return;
    supabase.from('levels').select('*').eq('education_type_id', eduId).then(({ data }) => setLevels(data || []));
  }, [eduId]);

  useEffect(() => {
    if (!levelId) return;
    supabase.from('departments').select('*').eq('level_id', levelId).then(({ data }) => setDepartments(data || []));
  }, [levelId]);

  function handlePhotos(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleExtract() {
    if (images.length === 0 || !subjectName) {
      setMessage('Enter Subject Name and snap/select at least 1 page photo.');
      return;
    }
    setExtracting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, paperNumber, subjectName, year }),
      });
      const data = await res.json();
      if (!res.ok) setMessage(data.error || 'Extraction failed.');
      else setQuestions(data.questions || []);
    } catch {
      setMessage('Network error during AI extraction.');
    } finally {
      setExtracting(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setMessage(null);
    try {
      let activeDeptId = deptId;
      if (!activeDeptId && newDeptName.trim() && levelId) {
        const { data: createdDept } = await supabase
          .from('departments')
          .insert({ level_id: levelId, name: newDeptName.trim() })
          .select('id')
          .single();
        if (createdDept) activeDeptId = createdDept.id;
      }

      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUserId: user.id,
          departmentId: activeDeptId,
          subjectName,
          subjectCode,
          year,
          paperNumber,
          questions,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Publish failed.');
      } else {
        setMessage('Success! Paper is now live for all subscribers.');
        setQuestions([]);
        setImages([]);
      }
    } catch {
      setMessage('Publish network error.');
    } finally {
      setPublishing(false);
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
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

          <input value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} placeholder="Or New Department (e.g. Science / Electrical)" className="rounded-xl bg-slate-800 border border-slate-700 p-3 text-white" />

          <input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="4. Subject Name (e.g. Mathematics)" className="rounded-xl bg-slate-800 border border-slate-700 p-3 text-white" />

          <input value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} placeholder="Subject Code (e.g. 0570)" className="rounded-xl bg-slate-800 border border-slate-700 p-3 text-white" />

          <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="5. Year (e.g. 2024)" className="rounded-xl bg-slate-800 border border-slate-700 p-3 text-white" />

          <select value={paperNumber} onChange={(e) => setPaperNumber(Number(e.target.value))} className="rounded-xl bg-slate-800 border border-slate-700 p-3 text-white">
            <option value={1}>Paper 1 (MCQ)</option>
            <option value={2}>Paper 2 (Structured/Essay)</option>
            <option value={3}>Paper 3 (Practical)</option>
          </select>
        </div>

        <div className="rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/60 p-5 space-y-3 text-center">
          <div className="grid grid-cols-2 gap-3">
            <label className="relative flex flex-col items-center justify-center rounded-xl bg-slate-800 active:bg-slate-700 border border-slate-600 p-4 text-white overflow-hidden">
              <Camera className="w-7 h-7 text-green-400 mb-1.5" />
              <span className="text-xs font-bold">Snap Camera</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => handlePhotos(e.target.files)}
              />
            </label>

            <label className="relative flex flex-col items-center justify-center rounded-xl bg-slate-800 active:bg-slate-700 border border-slate-600 p-4 text-white overflow-hidden">
              <ImageIcon className="w-7 h-7 text-sky-400 mb-1.5" />
              <span className="text-xs font-bold">Pick Gallery</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => handlePhotos(e.target.files)}
              />
            </label>
          </div>

          <span className="block text-[11px] text-slate-400">{images.length} page(s) selected</span>
        </div>

        {images.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((src, i) => (
              <img key={i} src={src} alt={`Page ${i + 1}`} className="h-20 rounded-lg border border-slate-700 object-cover" />
            ))}
          </div>
        )}

        <button
          type="button"
          disabled={extracting}
          onClick={handleExtract}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 font-bold text-sm text-slate-950 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {extracting ? 'Extracting & Solving with Gemini AI...' : 'Extract & Solve with Gemini AI'}
        </button>

        {message && (
          <p className="text-xs font-semibold text-center text-amber-300 bg-slate-800/80 rounded-xl p-3">
            {message}
          </p>
        )}
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
