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

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase();
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

    // Sorted highest to lowest score
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

    // Count most-failed question numbers across the class
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
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([num, count]) => ({ question_number: Number(num), fail_count: count }));

    let top3Questions: any[] = [];
    if (top3Numbers.length > 0) {
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
      const paperId = String(body.paper_id || '').trim();
      if (!teacherName || !paperId) {
        return NextResponse.json(
          { error: 'Teacher name and paper are required.' },
          { status: 400 }
        );
      }

      let created = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const classCode = generateClassCode();
        const { data, error } = await supabase
          .from('class_sessions')
          .insert({
            class_code: classCode,
            teacher_name: teacherName,
            paper_id: paperId,
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
          { error: 'Please enter your name and your teacher\'s class code.' },
          { status: 400 }
        );
      }

      const { data: session } = await supabase
        .from('class_sessions')
        .select('id, paper_id, expires_at')
        .eq('class_code', classCode)
        .single();

      if (!session || new Date(session.expires_at) <= new Date()) {
        return NextResponse.json(
          { error: 'Invalid or expired class code.' },
          { status: 404 }
        );
      }

      if (body.paper_id && session.paper_id !== body.paper_id) {
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
          
