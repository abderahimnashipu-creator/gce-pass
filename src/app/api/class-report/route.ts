import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

function generateClassCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'GCE-';
  for (let i = 0; i < 3; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase();
    const mode = req.nextUrl.searchParams.get('mode');
    if (!code) {
      return NextResponse.json({ error: 'Class code is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Auto-cleanup expired sessions
    await supabase
      .from('class_sessions')
      .delete()
      .lte('expires_at', new Date().toISOString());

    const { data: session, error: sErr } = await supabase
      .from('class_sessions')
      .select('*, papers(id, year, paper_number, subjects(code, name))')
      .eq('class_code', code)
      .single();

    if (sErr || !session) {
      return NextResponse.json(
        { error: 'Class code not found or has expired.' },
        { status: 404 }
      );
    }

    // Student Exam Fetch Mode: return the exact 50 ordered questions for this Class Code
    if (mode === 'exam') {
      const qIds: string[] = Array.isArray(session.question_ids)
        ? session.question_ids
        : [];

      let orderedQuestions: any[] = [];

      if (qIds.length > 0) {
        const { data: rawQs } = await supabase
          .from('questions')
          .select('*')
          .in('id', qIds);

        orderedQuestions = qIds
          .map((id, index) => {
            const found = (rawQs || []).find((q) => q.id === id);
            if (!found) return null;
            return { ...found, question_number: index + 1 };
          })
          .filter(Boolean);
      } else {
        const { data: rawQs } = await supabase
          .from('questions')
          .select('*')
          .eq('paper_id', session.paper_id)
          .order('question_number', { ascending: true });
        orderedQuestions = rawQs || [];
      }

      return NextResponse.json({
        session,
        questions: orderedQuestions,
      });
    }

    // Teacher Report Mode: submissions sorted highest to lowest
    const { data: submissions } = await supabase
      .from('class_submissions')
      .select('*')
      .eq('session_id', session.id)
      .order('score', { ascending: false });

    const rows = submissions || [];
    const totalStudents = rows.length;

    const avgPct =
      totalStudents > 0
        ? Math.round(
            rows.reduce(
              (sum, r) =>
                sum + (r.total_questions > 0 ? (r.score / r.total_questions) * 100 : 0),
              0
            ) / totalStudents
          )
        : 0;

    // Count most-failed question numbers (1..50 in this session)
    const failCounts: Record<number, number> = {};
    for (const r of rows) {
      const missed: number[] = Array.isArray(r.missed_questions)
        ? r.missed_questions
        : [];
      for (const qNum of missed) {
        failCounts[qNum] = (failCounts[qNum] || 0) + 1;
      }
    }

    const top3Numbers = Object.entries(failCounts)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 3)
      .map(([num, count]) => ({ question_number: Number(num), fail_count: count }));

    let top3Questions: any[] = [];
    if (top3Numbers.length > 0) {
      const qIds: string[] = Array.isArray(session.question_ids)
        ? session.question_ids
        : [];

      if (qIds.length > 0) {
        const targetIds = top3Numbers
          .map((t) => qIds[t.question_number - 1])
          .filter(Boolean);

        const { data: qData } = await supabase
          .from('questions')
          .select('id, question_text, static_correct_answer, static_explanation')
          .in('id', targetIds);

        top3Questions = top3Numbers.map((item) => {
          const targetId = qIds[item.question_number - 1];
          const found = (qData || []).find((q) => q.id === targetId);
          return {
            ...item,
            question_text: found?.question_text || '',
            static_correct_answer: found?.static_correct_answer || '',
            static_explanation: found?.static_explanation || '',
          };
        });
      } else {
        const { data: qData } = await supabase
          .from('questions')
          .select('question_number, question_text, static_correct_answer, static_explanation')
          .eq('paper_id', session.paper_id)
          .in(
            'question_number',
            top3Numbers.map((t) => t.question_number)
          );

        top3Questions = top3Numbers.map((item) => {
          const found = (qData || []).find(
            (q) => q.question_number === item.question_number
          );
          return {
            ...item,
            question_text: found?.question_text || '',
            static_correct_answer: found?.static_correct_answer || '',
            static_explanation: found?.static_explanation || '',
          };
        });
      }
    }

    return NextResponse.json({
      session,
      submissions: rows,
      stats: { totalStudents, avgPct, top3Questions },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = getSupabase();

    // Auto-cleanup expired sessions
    await supabase
      .from('class_sessions')
      .delete()
      .lte('expires_at', new Date().toISOString());

    if (body.action === 'create_session') {
      const teacherName = String(body.teacher_name || '').trim();
      const paperIds: string[] = Array.isArray(body.paper_ids)
        ? body.paper_ids
        : body.paper_id
        ? [String(body.paper_id)]
        : [];
      const shuffleQuestions = Boolean(body.shuffle_questions);

      if (!teacherName || paperIds.length === 0) {
        return NextResponse.json(
          { error: 'Teacher name and at least one paper year are required.' },
          { status: 400 }
        );
      }

      let selectedQuestionIds: string[] | null = null;

      // If multiple years selected OR shuffle enabled, build a 50-question shuffled set
      if (paperIds.length > 1 || shuffleQuestions) {
        const { data: pool } = await supabase
          .from('questions')
          .select('id')
          .in('paper_id', paperIds);

        if (!pool || pool.length === 0) {
          return NextResponse.json(
            { error: 'No questions found for the selected years.' },
            { status: 400 }
          );
        }

        const shuffled = shuffleArray(pool.map((q) => q.id));
        selectedQuestionIds = shuffled.slice(0, 50);
      }

      let created = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const classCode = generateClassCode();
        const { data, error } = await supabase
          .from('class_sessions')
          .insert({
            class_code: classCode,
            teacher_name: teacherName,
            paper_id: paperIds[0],
            question_ids: selectedQuestionIds,
          })
          .select()
          .single();

        if (!error && data) {
          created = data;
          break;
        }
      }

      if (!created) {
        return NextResponse.json(
          { error: 'Could not generate class code. Try again.' },
          { status: 500 }
        );
      }

      return NextResponse.json({ session: created });
    }

    if (body.action === 'submit_score') {
      const classCode = String(body.class_code || '').trim().toUpperCase();
      const studentName = String(body.student_name || '').trim();
      const score = Number(body.score ?? 0);
      const totalQuestions = Number(body.total_questions ?? 0);
      const missedQuestions = Array.isArray(body.missed_questions)
        ? body.missed_questions
        : [];

      if (!classCode || !studentName) {
        return NextResponse.json(
          { error: "Please enter your name and your teacher's class code." },
          { status: 400 }
        );
      }

      const { data: session } = await supabase
        .from('class_sessions')
        .select('id, paper_id, question_ids, expires_at')
        .eq('class_code', classCode)
        .single();

      if (!session || new Date(session.expires_at) <= new Date()) {
        return NextResponse.json(
          { error: 'Invalid or expired class code.' },
          { status: 404 }
        );
      }

      // Only enforce single-paper match if this session isn't a multi-year mixed exam
      const isMixed =
        Array.isArray(session.question_ids) && session.question_ids.length > 0;
      if (!isMixed && body.paper_id && session.paper_id !== body.paper_id) {
        return NextResponse.json(
          { error: 'This class code is for a different past paper.' },
          { status: 400 }
        );
      }

      const { error: insErr } = await supabase.from('class_submissions').insert({
        session_id: session.id,
        student_name: studentName,
        score,
        total_questions: totalQuestions,
        missed_questions: missedQuestions,
      });

      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ error: 'Class code is required' }, { status: 400 });
    }

    const supabase = getSupabase();
    await supabase.from('class_sessions').delete().eq('class_code', code);

    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
                               }
