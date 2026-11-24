'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

function readCache(key: string): any[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCache(key: string, data: any[]) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

export default function PaperSelector({
  onSelectPaper,
}: {
  onSelectPaper: (paper: any) => void;
}) {
  const [eduTypes, setEduTypes] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  const [eduId, setEduId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [deptId, setDeptId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [year, setYear] = useState('');
  const [paperId, setPaperId] = useState('');

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  useEffect(() => {
    const key = 'gce_cache_edu_types';
    const cached = readCache(key);
    if (cached.length) setEduTypes(cached);
    supabase.from('education_types').select('*').order('name').then(({ data, error }) => {
      if (!error && data) {
        setEduTypes(data);
        writeCache(key, data);
      }
    });
  }, []);
    useEffect(() => {
    if (!eduId) return;
    setLevelId(''); setDeptId(''); setSubjectId(''); setYear(''); setPaperId('');
    const key = `gce_cache_levels_${eduId}`;
    setLevels(readCache(key));
    supabase.from('levels').select('*').eq('education_type_id', eduId).order('name').then(({ data, error }) => {
      if (!error && data) { setLevels(data); writeCache(key, data); }
    });
  }, [eduId]);

  useEffect(() => {
    if (!levelId) return;
    setDeptId(''); setSubjectId(''); setYear(''); setPaperId('');
    const key = `gce_cache_depts_${levelId}`;
    setDepartments(readCache(key));
    supabase.from('departments').select('*').eq('level_id', levelId).order('name').then(({ data, error }) => {
      if (!error && data) { setDepartments(data); writeCache(key, data); }
    });
  }, [levelId]);

  useEffect(() => {
    if (!deptId) return;
    setSubjectId(''); setYear(''); setPaperId('');
    const key = `gce_cache_subjects_${deptId}`;
    setSubjects(readCache(key));
    supabase.from('subjects').select('*').eq('department_id', deptId).order('name').then(({ data, error }) => {
      if (!error && data) { setSubjects(data); writeCache(key, data); }
    });
  }, [deptId]);

  useEffect(() => {
    if (!subjectId) return;
    setYear(''); setPaperId('');
    const key = `gce_cache_papers_${subjectId}`;
    setPapers(readCache(key));
    supabase.from('papers').select('*').eq('subject_id', subjectId).eq('is_published', true).order('year', { ascending: false }).then(({ data, error }) => {
      if (!error && data) { setPapers(data); writeCache(key, data); }
    });
  }, [subjectId]);

  const years = Array.from(new Set(papers.map((p) => p.year)));
  const yearPapers = papers.filter((p) => String(p.year) === String(year));

  return (
    <section className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">Select Your Past Paper</h2>
        {isOffline && (
          <span className="rounded-full bg-amber-950 border border-amber-700 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
            Offline Mode
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select value={eduId} onChange={(e) => setEduId(e.target.value)} className="rounded-xl bg-slate-800 border border-slate-700 p-3 text-sm text-white">
          <option value="">1. Education Type</option>
          {eduTypes.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>

        <select value={levelId} onChange={(e) => setLevelId(e.target.value)} disabled={!eduId} className="rounded-xl bg-slate-800 border border-slate-700 p-3 text-sm text-white disabled:opacity-40">
          <option value="">2. Level</option>
          {levels.map((l) => <option key={l.id} value={l.id} disabled={!l.is_active}>{l.name} {!l.is_active ? '(Soon)' : ''}</option>)}
        </select>

        <select value={deptId} onChange={(e) => setDeptId(e.target.value)} disabled={!levelId} className="rounded-xl bg-slate-800 border border-slate-700 p-3 text-sm text-white disabled:opacity-40">
          <option value="">3. Department</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!deptId} className="rounded-xl bg-slate-800 border border-slate-700 p-3 text-sm text-white disabled:opacity-40">
          <option value="">4. Subject</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.code ? `${s.code} - ` : ''}{s.name}</option>)}
        </select>

        <select value={year} onChange={(e) => { setYear(e.target.value); setPaperId(''); }} disabled={!subjectId} className="rounded-xl bg-slate-800 border border-slate-700 p-3 text-sm text-white disabled:opacity-40">
          <option value="">5. Year</option>
          {years.map((yr) => <option key={yr} value={yr}>{yr}</option>)}
        </select>

        <select
          value={paperId}
          onChange={(e) => {
            setPaperId(e.target.value);
            const found = papers.find((p) => p.id === e.target.value);
            if (found) onSelectPaper(found);
          }}
          disabled={!year}
          className="rounded-xl bg-slate-800 border border-slate-700 p-3 text-sm text-white disabled:opacity-40"
        >
          <option value="">6. Paper (1, 2 or 3)</option>
          {yearPapers.map((p) => <option key={p.id} value={p.id}>Paper {p.paper_number}</option>)}
        </select>
      </div>
    </section>
  );
}
