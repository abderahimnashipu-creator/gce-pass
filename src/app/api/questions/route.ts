import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, paper_id } = await req.json();
    if (!user_id || !paper_id) {
      return NextResponse.json({ error: 'Missing user or paper ID' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: user, error: uErr } = await supabase
      .from('users')
      .select('id, role, subscription_expires_at')
      .eq('id', user_id)
      .single();

    if (uErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isActive =
      user.role === 'admin' ||
      (user.subscription_expires_at &&
        new Date(user.subscription_expires_at).getTime() > Date.now());

    if (!isActive) {
      return NextResponse.json({ error: 'Subscription expired' }, { status: 403 });
    }

    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select('*')
      .eq('paper_id', paper_id)
      .order('question_number', { ascending: true });

    if (qErr) throw qErr;
    return NextResponse.json({ questions: questions || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
      }
