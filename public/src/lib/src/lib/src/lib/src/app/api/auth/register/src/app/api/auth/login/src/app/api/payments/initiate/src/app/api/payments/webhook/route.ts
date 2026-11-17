import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

function computeNewExpiry(currentExpiry: string | null, planType: string): string {
  const now = new Date();
  const baseDate =
    currentExpiry && new Date(currentExpiry).getTime() > now.getTime()
      ? new Date(currentExpiry)
      : now;

  if (planType === 'monthly') {
    return new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  // Academic Year Pass: expires August 31 of the active academic cycle
  const year = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  return new Date(Date.UTC(year, 7, 31, 23, 59, 59)).toISOString();
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const externalRef = payload.externalId || payload.external_ref;
    const status = (payload.status || '').toUpperCase();

    if (!externalRef) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const { data: tx } = await supabase
      .from('transactions')
      .select('*')
      .eq('external_ref', externalRef)
      .maybeSingle();

    if (!tx || tx.status === 'successful') {
      return NextResponse.json({ received: true });
    }

    if (status === 'SUCCESSFUL') {
      await supabase
        .from('transactions')
        .update({ status: 'successful' })
        .eq('id', tx.id);

      const { data: user } = await supabase
        .from('users')
        .select('subscription_expires_at')
        .eq('id', tx.user_id)
        .single();

      const newExpiry = computeNewExpiry(
        user?.subscription_expires_at || null,
        tx.plan_type
      );

      await supabase
        .from('users')
        .update({
          subscription_plan: tx.plan_type,
          subscription_expires_at: newExpiry,
        })
        .eq('id', tx.user_id);
    } else if (status === 'FAILED' || status === 'EXPIRED') {
      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', tx.id);
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
