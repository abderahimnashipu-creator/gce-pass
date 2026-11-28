import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Invalid user' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, phone_number, role, subscription_plan, subscription_expires_at')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: data });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
