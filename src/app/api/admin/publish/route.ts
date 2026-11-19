import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const {
      adminUserId,
      levelId,
      departmentId,
      newDeptName,
      subjectName,
      subjectCode,
      year,
      paperNumber,
      durationMinutes,
      questions,
    } = await req.json();

    const supabase = getServiceSupabase();

    // Verify caller is an admin
    const { data: adminUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminUserId)
      .single();

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Resolve or create Department on the server
    let activeDeptId = departmentId;
    if (!activeDeptId && newDeptName?.trim() && levelId) {
      const { data: existingDept } = await supabase
        .from('departments')
        .select('id')
        .eq('level_id', levelId)
        .ilike('name', newDeptName.trim())
        .maybeSingle();

      if (existingDept) {
        activeDeptId = existingDept.id;
      } else {
        const { data: createdDept, error: deptErr } = await supabase
          .from('departments')
          .insert({ level_id: levelId, name: newDeptName.trim() })
          .select('id')
          .single();
        if (deptErr) throw deptErr;
        activeDeptId = createdDept.id;
      }
    }

    if (!activeDeptId) {
      return NextResponse.json(
        { error: 'Please select or enter a Department.' },
        { status: 400 }
      );
    }

    // Find or create Subject
    let { data: subject } = await supabase
      .from('subjects')
      .select('id')
      .eq('department_id', activeDeptId)
      .ilike('name', subjectName.trim())
      .maybeSingle();

    if (!subject) {
      const { data: createdSub, error: subErr } = await supabase
        .from('subjects')
        .insert({
          department_id: activeDeptId,
          name: subjectName.trim(),
          code: (subjectCode || '').trim(),
        })
        .select('id')
        .single();
      if (subErr) throw subErr;
      subject = createdSub;
    }

    // Find or create Paper
    let { data: paper } = await supabase
      .from('papers')
      .select('id')
      .eq('subject_id', subject.id)
      .eq('year', Number(year))
      .eq('paper_number', Number(paperNumber))
      .maybeSingle();

    if (!paper) {
      const { data: createdPaper, error: papErr } = await supabase
        .from('papers')
        .insert({
          subject_id: subject.id,
          year: Number(year),
          paper_number: Number(paperNumber),
          duration_minutes: Number(durationMinutes) || 90,
          is_published: true,
        })
        .select('id')
        .single();
      if (papErr) throw papErr;
      paper = createdPaper;
    } else {
      await supabase
        .from('papers')
        .update({ is_published: true })
        .eq('id', paper.id);
    }

    // Insert/Replace verified static questions
    await supabase.from('questions').delete().eq('paper_id', paper.id);

    const rows = questions.map((q: any, idx: number) => ({
      paper_id: paper.id,
      question_number: Number(q.question_number) || idx + 1,
      question_text: q.question_text,
      diagram_url: q.diagram_url || null,
      option_a: q.option_a || null,
      option_b: q.option_b || null,
      option_c: q.option_c || null,
      option_d: q.option_d || null,
      static_correct_answer: q.static_correct_answer,
      static_explanation: q.static_explanation,
    }));

    const { error: insErr } = await supabase.from('questions').insert(rows);
    if (insErr) throw insErr;

    return NextResponse.json({ success: true, paperId: paper.id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to publish paper.' },
      { status: 500 }
    );
  }
}
