'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import MathText from '@/components/MathText';
import {
  Users,
  Share2,
  Trash2,
  Search,
  PlusCircle,
  AlertTriangle,
  Trophy,
  RefreshCw,
  Clock,
  CheckCircle,
  Award,
  Shuffle,
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function getGradeBadge(pct: number) {
  if (pct >= 75) return 'Grade A';
  if (pct >= 65) return 'Grade B';
  if (pct >= 50) return 'Grade C';
  if (pct >= 40) return 'Grade D';
  if (pct >= 35) return 'Grade E';
  if (pct >= 30) return 'Grade F';
  return 'Grade U';
}

function TeacherAndAssignmentPortal() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code')?.trim().toUpperCase() || '';

  const [tab, setTab] = useState<'create' | 'report' | 'student'>(
    initialCode ? 'student' : 'create'
  );
  const [papers, setPapers] = useState<any[]>([]);
  const [teacherName, setTeacherName] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([]);
  const [shuffleOrder, setShuffleOrder] = useState(true);
  const [createdSession, setCreatedSession] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  const [lookupCode, setLookupCode] = useState(initialCode);
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const [studentCode, setStudentCode] = useState(initialCode);
  const [studentName, setStudentName] = useState('');
  const [examSession, setExamSession] = useState<any>(null);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [scoreSent, setScoreSent] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(90 * 60);
  const [loadingExam, setLoadingExam] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
    useEffect(() => {
    async function loadPapers() {
      const { data } = await supabase
        .from('papers')
        .select('id, year, paper_number, subject_id, subjects(id, code, name)')
        .eq('paper_number', 1)
        .order('year', { ascending: false });

      if (data && data.length > 0) {
        setPapers(data);
        const firstSubj = data.subject_id;
        setSelectedSubjectId(firstSubj);
        const matching = data.filter((p) => p.subject_id === firstSubj);
        setSelectedPaperIds(matching.map((p) => p.id));
      }
    }
    loadPapers();
  }, []);

  useEffect(() => {
    if (initialCode) {
      loadStudentAssignment(initialCode);
    }
  }, [initialCode]);

  useEffect(() => {
    if (tab !== 'student' || !examSession || submitted) return;
    if (secondsLeft <= 0) {
      setSubmitted(true);
      return;
    }
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [tab, examSession, submitted, secondsLeft]);

  const subjectsMap = new Map<string, { id: string; code: string; name: string }>();
  for (const p of papers) {
    if (p.subjects && !subjectsMap.has(p.subject_id)) {
      subjectsMap.set(p.subject_id, p.subjects);
    }
  }
  const subjectsList = Array.from(subjectsMap.values());
  const subjectPapers = papers.filter((p) => p.subject_id === selectedSubjectId);

  function handleSubjectChange(subjId: string) {
    setSelectedSubjectId(subjId);
    const matching = papers.filter((p) => p.subject_id === subjId);
    setSelectedPaperIds(matching.map((p) => p.id));
  }

  function togglePaperYear(paperId: string) {
    setSelectedPaperIds((prev) =>
      prev.includes(paperId)
        ? prev.filter((id) => id !== paperId)
        : [...prev, paperId]
    );
  }
    async function handleCreateCode(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    if (selectedPaperIds.length === 0) {
      setErrorMsg('Please select at least one exam year.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/class-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_session',
          teacher_name: teacherName,
          paper_ids: selectedPaperIds,
          shuffle_questions: shuffleOrder,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create code');
      setCreatedSession(json.session);
      setLookupCode(json.session.class_code);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function fetchReport(codeToLoad?: string) {
    const code = (codeToLoad || lookupCode).trim().toUpperCase();
    if (!code) return;
    setErrorMsg('');
    setLoadingReport(true);
    try {
      const res = await fetch(`/api/class-report?code=${encodeURIComponent(code)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Report not found');
      setReportData(json);
    } catch (err: any) {
      setReportData(null);
      setErrorMsg(err.message);
    } finally {
      setLoadingReport(false);
    }
  }

  async function loadStudentAssignment(codeToLoad?: string) {
    const code = (codeToLoad || studentCode).trim().toUpperCase();
    if (!code) return;
    setErrorMsg('');
    setLoadingExam(true);
    try {
      const res = await fetch(
        `/api/class-report?mode=exam&code=${encodeURIComponent(code)}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Assignment code not found');
      setExamSession(json.session);
      setExamQuestions(json.questions || []);
      setAnswers({});
      setSubmitted(false);
      setScoreSent(false);
      setSecondsLeft(90 * 60);
    } catch (err: any) {
      setExamSession(null);
      setErrorMsg(err.message);
    } finally {
      setLoadingExam(false);
    }
      }
    async function handleStudentSubmitToTeacher() {
    if (!examSession || !studentName.trim()) {
      setErrorMsg('Please enter your full name before submitting.');
      return;
    }
    setErrorMsg('');
    setSubmittingScore(true);

    const score = examQuestions.reduce(
      (acc, q) =>
        answers[q.id]?.toUpperCase() === q.static_correct_answer.toUpperCase()
          ? acc + 1
          : acc,
      0
    );

    const missedNumbers = examQuestions
      .filter(
        (q) =>
          answers[q.id]?.toUpperCase() !== q.static_correct_answer.toUpperCase()
      )
      .map((q) => q.question_number);

    try {
      const res = await fetch('/api/class-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_score',
          class_code: examSession.class_code,
          student_name: studentName.trim(),
          score,
          total_questions: examQuestions.length,
          missed_questions: missedNumbers,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not submit score');
      setScoreSent(true);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingScore(false);
    }
  }

  async function handleDeleteNow() {
    if (!reportData?.session?.class_code) return;
    if (!confirm('Delete this class report and all student scores now?')) return;
    await fetch(
      `/api/class-report?code=${encodeURIComponent(reportData.session.class_code)}`,
      { method: 'DELETE' }
    );
    setReportData(null);
    setLookupCode('');
  }

  function shareAssignmentToWhatsApp() {
    if (!createdSession) return;
    const subjObj = subjectsMap.get(selectedSubjectId);
    const subj = subjObj ? `${subjObj.code} - ${subjObj.name}` : 'GCE Paper 1';
    const yearsLabel = subjectPapers
      .filter((p) => selectedPaperIds.includes(p.id))
      .map((p) => p.year)
      .join(', ');
    const link = `https://vercel.app{createdSession.class_code}`;
    const text = `📚 *GCE PASS CLASS ASSIGNMENT*\nTeacher: ${createdSession.teacher_name}\nSubject: ${subj} (${yearsLabel})\nClass Code: *${createdSession.class_code}*\n\nTap link below to start Timed Exam and submit your score directly:\n${link}`;
    window.open(`https://wa.me{encodeURIComponent(text)}`, '_blank');
  }

  function shareSummaryToWhatsApp() {
    if (!reportData) return;
    const { session, stats } = reportData;
    const subj = session.papers?.subjects
      ? `${session.papers.subjects.code} - ${session.papers.subjects.name}`
      : 'GCE Paper 1';
    const topFailedText =
      stats.top3Questions.length > 0
        ? stats.top3Questions
            .map(
              (q: any, i: number) =>
                `${i + 1}. Q${q.question_number} (Failed by ${q.fail_count}/${stats.totalStudents} students)`
            )
            .join('\n')
        : 'None yet';

    const text = `📊 *CLASS EXAM SUMMARY (${session.class_code})*\nSubject: ${subj}\nStudents Completed: ${stats.totalStudents}\nClass Average: ${stats.avgPct}% (${getGradeBadge(stats.avgPct)})\n\n⚠️ *Top 3 Questions We Will Revise:*\n${topFailedText}\n\nKeep practicing on https://vercel.app`;
    window.open(`https://wa.me{encodeURIComponent(text)}`, '_blank');
  }

  const studentScore = examQuestions.reduce(
    (acc, q) =>
      answers[q.id]?.toUpperCase() === q.static_correct_answer.toUpperCase()
        ? acc + 1
        : acc,
    0
  );
  const studentPct =
    examQuestions.length > 0
      ? Math.round((studentScore / examQuestions.length) * 100)
      : 0;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
    return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
          <div className="flex items-center gap-2.5 text-green-400 font-bold text-lg">
            <Users className="w-5 h-5" />
            <span>Class Assignments & Teacher Reports</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Teachers generate 1 code (mixing 1 or more years). Students take the exam and results group automatically without WhatsApp spam.
          </p>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <button
              onClick={() => {
                setTab('create');
                setErrorMsg('');
              }}
              className={`flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold transition ${
                tab === 'create'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" /> Assign
            </button>
            <button
              onClick={() => {
                setTab('student');
                setErrorMsg('');
              }}
              className={`flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold transition ${
                tab === 'student'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              <Award className="w-3.5 h-3.5" /> Student Exam
            </button>
            <button
              onClick={() => {
                setTab('report');
                setErrorMsg('');
                if (lookupCode) fetchReport(lookupCode);
              }}
              className={`flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold transition ${
                tab === 'report'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              <Search className="w-3.5 h-3.5" /> Report
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-red-950/70 border border-red-600 p-3 text-xs text-red-200">
            {errorMsg}
          </div>
        )}

        {tab === 'create' && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
            <form onSubmit={handleCreateCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Teacher Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mr. Foncham"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Subject (Paper 1)
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white"
                >
                  {subjectsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Year(s) to Mix (Up to 50 Random Questions)
                </label>
                <div className="flex flex-wrap gap-2">
                  {subjectPapers.map((p) => {
                    const checked = selectedPaperIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePaperYear(p.id)}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition ${
                          checked
                            ? 'border-green-500 bg-green-500/20 text-green-300'
                            : 'border-slate-700 bg-slate-950 text-slate-400'
                        }`}
                      >
                        {checked ? '✓ ' : '+ '}
                        {p.year} Paper 1
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleOrder}
                  onChange={(e) => setShuffleOrder(e.target.checked)}
                  className="rounded border-slate-700"
                />
                <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                <span>Shuffle question order (prevents memorizing A/B/C/D positions)</span>
              </label>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-sm text-white"
              >
                {creating ? 'Generating Code...' : 'Generate Class Assignment Code'}
              </button>
            </form>

            {createdSession && (
              <div className="rounded-2xl bg-green-950/60 border border-green-500 p-4 text-center space-y-3">
                <div className="text-xs text-green-300 font-semibold">
                  Class Assignment Code (Auto-deletes in 7 days)
                </div>
                <div className="text-3xl font-mono font-extrabold tracking-widest text-white">
                  {createdSession.class_code}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={shareAssignmentToWhatsApp}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 hover:bg-green-500 px-4 py-2 text-xs font-bold text-white"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share Link to Class WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('report');
                      fetchReport(createdSession.class_code);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-bold text-slate-200"
                  >
                    View Live Report
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
                {tab === 'student' && (
          <div className="space-y-5">
            {!examSession ? (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
                <div className="text-sm font-bold text-white">
                  Enter Your Teacher&apos;s Class Code
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. GCE-482"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                    className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm font-mono uppercase text-white"
                  />
                  <button
                    type="button"
                    onClick={() => loadStudentAssignment()}
                    disabled={loadingExam}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs"
                  >
                    {loadingExam ? 'Loading...' : 'Start Exam'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="sticky top-0 z-30 flex items-center justify-between rounded-2xl bg-slate-900/95 backdrop-blur border border-slate-800 p-4">
                  <div>
                    <div className="text-xs text-blue-400 font-bold">
                      Code: {examSession.class_code} • {examSession.teacher_name}
                    </div>
                    <div className="text-xs text-slate-300">
                      {examSession.papers?.subjects?.code} - {examSession.papers?.subjects?.name}
                    </div>
                  </div>
                  {!submitted && (
                    <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-amber-400">
                      <Clock className="w-4 h-4" />
                      <span>
                        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                      </span>
                    </div>
                  )}
                </div>

                {submitted && (
                  <div className="rounded-2xl bg-green-950/70 border border-green-500 p-5 text-center space-y-3">
                    <div className="text-2xl font-extrabold text-white">
                      {studentScore} / {examQuestions.length} ({studentPct}% — {getGradeBadge(studentPct)})
                    </div>

                    {!scoreSent ? (
                      <div className="max-w-sm mx-auto space-y-2.5 pt-1">
                        <input
                          type="text"
                          placeholder="Enter Your Full Name"
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-white text-center"
                        />
                        <button
                          type="button"
                          onClick={handleStudentSubmitToTeacher}
                          disabled={submittingScore}
                          className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-xs text-white"
                        >
                          {submittingScore ? 'Sending...' : 'Submit Score to Teacher Report'}
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-green-300">
                        <CheckCircle className="w-4 h-4" /> Score sent to {examSession.teacher_name}!
                      </div>
                    )}
                  </div>
                )}

                {examQuestions.map((q) => {
                  const picked = answers[q.id];
                  const options = [
                    { key: 'A', text: q.option_a },
                    { key: 'B', text: q.option_b },
                    { key: 'C', text: q.option_c },
                    { key: 'D', text: q.option_d },
                  ];

                  return (
                    <div
                      key={q.id}
                      className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3"
                    >
                      <div className="flex items-start gap-2.5">
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
                          alt={`Diagram Q${q.question_number}`}
                          className="max-h-60 rounded-xl border border-slate-700 bg-white p-2 object-contain"
                        />
                      )}

                      <div className="grid grid-cols-1 gap-2">
                        {options.map((opt) => {
                          if (!opt.text) return null;
                          const isSelected = picked === opt.key;
                          const isCorrect =
                            opt.key === q.static_correct_answer.toUpperCase();

                          let style =
                            'border-slate-700 bg-slate-800/60 text-slate-200';
                          if (submitted) {
                            if (isCorrect)
                              style =
                                'border-green-500 bg-green-500/20 text-green-200 font-semibold';
                            else if (isSelected)
                              style = 'border-red-500 bg-red-500/20 text-red-200';
                          } else if (isSelected) {
                            style =
                              'border-amber-400 bg-amber-400/20 text-amber-200 font-semibold';
                          }

                          return (
                            <button
                              key={opt.key}
                              type="button"
                              disabled={submitted}
                              onClick={() =>
                                setAnswers((prev) => ({ ...prev, [q.id]: opt.key }))
                              }
                              className={`flex items-start gap-2 rounded-xl border p-3 text-left text-sm transition ${style}`}
                            >
                              <span className="font-bold">{opt.key}.</span>
                              <MathText text={opt.text} />
                            </button>
                          );
                        })}
                      </div>

                      {submitted && (
                        <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs space-y-1">
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

                {!submitted && examQuestions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full py-3.5 rounded-2xl bg-green-600 hover:bg-green-500 font-bold text-white shadow-lg"
                  >
                    Finish & Grade Exam
                  </button>
                )}
              </div>
            )}
          </div>
        )}
                {tab === 'report' && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex gap-2">
              <input
                type="text"
                placeholder="Enter Class Code (e.g. GCE-482)"
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm font-mono uppercase text-white"
              />
              <button
                type="button"
                onClick={() => fetchReport()}
                disabled={loadingReport}
                className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingReport ? 'animate-spin' : ''}`} />
                Load
              </button>
            </div>

            {reportData && (
              <div className="space-y-5">
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400">
                        Code: <span className="font-mono font-bold text-amber-400">{reportData.session.class_code}</span> • {reportData.session.teacher_name}
                      </div>
                      <div className="text-base font-bold text-white mt-0.5">
                        {reportData.session.papers?.subjects?.code} - {reportData.session.papers?.subjects?.name}
                      </div>
                    </div>
                    <button
                      onClick={handleDeleteNow}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-950 border border-red-700 px-2.5 py-1.5 text-xs font-semibold text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Now
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="rounded-xl bg-slate-950 p-3 text-center">
                      <div className="text-xs text-slate-400">Students Submitted</div>
                      <div className="text-2xl font-extrabold text-white mt-0.5">
                        {reportData.stats.totalStudents}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-950 p-3 text-center">
                      <div className="text-xs text-slate-400">Class Average</div>
                      <div className="text-2xl font-extrabold text-green-400 mt-0.5">
                        {reportData.stats.avgPct}% ({getGradeBadge(reportData.stats.avgPct)})
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={shareSummaryToWhatsApp}
                    className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-xs font-bold text-white flex items-center justify-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Post Class Summary to WhatsApp Group
                  </button>
                </div>

                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Top 3 Most-Failed Questions to Revise in Class</span>
                  </div>

                  {reportData.stats.top3Questions.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Waiting for student submissions to calculate missed questions.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {reportData.stats.top3Questions.map((q: any, idx: number) => (
                        <div
                          key={q.question_number}
                          className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-amber-400">
                              #{idx + 1} Most Failed — Question {q.question_number}
                            </span>
                            <span className="text-red-400">
                              Failed by {q.fail_count}/{reportData.stats.totalStudents} students
                            </span>
                          </div>
                          <div className="text-slate-200">
                            <MathText text={q.question_text} />
                          </div>
                          <div className="text-green-400 font-semibold">
                            Correct Answer: {q.static_correct_answer} — <MathText text={q.static_explanation} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                    <Trophy className="w-4 h-4" />
                    <span>Student Scores (Highest to Lowest)</span>
                  </div>

                  {reportData.submissions.length === 0 ? (
                    <p className="text-xs text-slate-400">No students have submitted yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-800">
                      {reportData.submissions.map((sub: any, idx: number) => {
                        const pct =
                          sub.total_questions > 0
                            ? Math.round((sub.score / sub.total_questions) * 100)
                            : 0;
                        return (
                          <div
                            key={sub.id}
                            className="py-2.5 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-400 mr-2">#{idx + 1}</span>
                              <span className="font-semibold text-white">{sub.student_name}</span>
                              {Array.isArray(sub.missed_questions) && sub.missed_questions.length > 0 && (
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  Missed: {sub.missed_questions.map((n: number) => `Q${n}`).join(', ')}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-white">
                                {sub.score}/{sub.total_questions} ({pct}%)
                              </div>
                              <div className="text-[11px] font-semibold text-amber-400">
                                {getGradeBadge(pct)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeacherPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white p-6">Loading...</div>}>
      <TeacherAndAssignmentPortal />
    </Suspense>
  );
}
